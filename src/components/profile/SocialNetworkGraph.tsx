import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Users,
  Network,
  ExternalLink,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { AuthorProfileTarget } from '../../types';
import { User, useAuth } from '../../contexts/AuthContext';
import {
  AuthorFollowRecord,
  subscribeToUserFollowing,
  subscribeToAuthorFollowersList,
  fetchUserFollowingOnce,
  fetchAuthorFollowersOnce,
  normalizeAuthorFollowKey,
} from '../../services/firestoreService';
import { getUserInitials, isCustomUploadedAvatar } from '../../utils/avatarUtils';
import { isUserVerified } from '../../utils/userVerificationUtils';
import { FollowAuthorButton } from '../common/FollowAuthorButton';
import { UserAvatar } from '../common/UserAvatar';
import { VerifiedBadge } from '../common/VerifiedBadge';

export type SocialRelationType = 'root' | 'mutual' | 'following' | 'follower' | 'second-degree';
type GraphFilterMode = 'all' | 'mutual' | 'following' | 'follower';

export interface SocialGraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  relation: SocialRelationType;
  degree: number;
  userId?: string;
  isVerified?: boolean;
}

export interface SocialGraphLink extends d3.SimulationLinkDatum<SocialGraphNode> {
  id: string;
  source: string | SocialGraphNode;
  target: string | SocialGraphNode;
  kind: 'following' | 'follower' | 'mutual' | 'network';
}

export interface SocialNetworkGraphProps {
  rootUserId?: string;
  rootUserName: string;
  rootUserAvatar?: string;
  rootUserRole?: string;
  onAuthorClick?: (author: AuthorProfileTarget) => void;
  className?: string;
}

const NODE_COLORS: Record<SocialRelationType, { fill: string; stroke: string; badgeBg: string; label: string }> = {
  root: {
    fill: '#006194',
    stroke: '#004b73',
    badgeBg: 'bg-primary/10 text-primary border-primary/25',
    label: 'Profil v središču',
  },
  mutual: {
    fill: '#7c3aed',
    stroke: '#5b21b6',
    badgeBg: 'bg-purple-500/12 text-purple-700 dark:text-purple-300 border-purple-500/30',
    label: 'Vzajemna povezava',
  },
  following: {
    fill: '#0284c7',
    stroke: '#0369a1',
    badgeBg: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30',
    label: 'Sledi',
  },
  follower: {
    fill: '#006c4a',
    stroke: '#005137',
    badgeBg: 'bg-secondary/12 text-secondary border-secondary/30',
    label: 'Sledilec',
  },
  'second-degree': {
    fill: '#64748b',
    stroke: '#475569',
    badgeBg: 'bg-surface-container text-on-surface-variant border-surface-container-high',
    label: 'Omrežje 2. stopnje',
  },
};

function getNodeRadius(node: SocialGraphNode): number {
  if (node.relation === 'root') return 26;
  if (node.relation === 'mutual') return 20;
  if (node.relation === 'following' || node.relation === 'follower') return 18;
  return 15;
}

function resolveMatchedUser(
  keyOrId: string,
  nameHint: string | undefined,
  users: User[]
): User | undefined {
  const cleanKey = (keyOrId || '').trim().toLowerCase();
  const cleanName = (nameHint || '').trim().toLowerCase();
  return users.find((u) => {
    if (u.id.toLowerCase() === cleanKey) return true;
    const norm = normalizeAuthorFollowKey(u.id, u.name).toLowerCase();
    if (norm === cleanKey) return true;
    if (cleanName && u.name.trim().toLowerCase() === cleanName) return true;
    return false;
  });
}

export function SocialNetworkGraph({
  rootUserId,
  rootUserName,
  rootUserAvatar,
  rootUserRole,
  onAuthorClick,
  className = '',
}: SocialNetworkGraphProps) {
  const { users, currentUser } = useAuth();

  const rootKey = useMemo(
    () => normalizeAuthorFollowKey(rootUserId, rootUserName),
    [rootUserId, rootUserName]
  );

  const [followingRecords, setFollowingRecords] = useState<AuthorFollowRecord[]>([]);
  const [followerRecords, setFollowerRecords] = useState<AuthorFollowRecord[]>([]);
  const [secondDegreeEdges, setSecondDegreeEdges] = useState<{
    followingByKey: Record<string, AuthorFollowRecord[]>;
    followersByKey: Record<string, AuthorFollowRecord[]>;
  }>({ followingByKey: {}, followersByKey: {} });
  const [isLoadingSecondDegree, setIsLoadingSecondDegree] = useState(false);

  const [filterMode, setFilterMode] = useState<GraphFilterMode>('all');
  const [includeSecondDegree, setIncludeSecondDegree] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const selectionRefs = useRef<{
    nodeGroups: d3.Selection<SVGGElement, SocialGraphNode, SVGGElement, unknown> | null;
    linkLines: d3.Selection<SVGLineElement, SocialGraphLink, SVGGElement, unknown> | null;
    width: number;
    height: number;
  }>({ nodeGroups: null, linkLines: null, width: 720, height: 440 });

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 720,
    height: 440,
  });

  // Track responsive container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(320, Math.round(rect.width));
      const h = w < 520 ? 360 : 440;
      setCanvasSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Subscribe to root user's real-time following & followers collections
  useEffect(() => {
    if (!rootKey) return;
    setSelectedNodeId(null);
    setHoveredNodeId(null);

    const unsubFollowing = subscribeToUserFollowing(rootUserId || rootKey, (_keys, records) => {
      setFollowingRecords(records);
    });
    const unsubFollowers = subscribeToAuthorFollowersList(rootKey, (records) => {
      setFollowerRecords(records);
    });

    return () => {
      unsubFollowing();
      unsubFollowers();
    };
  }, [rootUserId, rootKey]);

  // Fetch 2nd-degree connections from Firestore for direct neighbors
  useEffect(() => {
    if (!includeSecondDegree) {
      setSecondDegreeEdges({ followingByKey: {}, followersByKey: {} });
      return;
    }

    const neighborKeys = Array.from(
      new Set([
        ...followingRecords.map((r) => normalizeAuthorFollowKey(r.authorId || r.id, r.authorName)),
        ...followerRecords.map((r) => normalizeAuthorFollowKey(r.followerId || r.id, r.followerName)),
      ])
    )
      .filter((k) => k && k !== rootKey)
      .slice(0, 12);

    if (neighborKeys.length === 0) {
      setSecondDegreeEdges({ followingByKey: {}, followersByKey: {} });
      return;
    }

    let cancelled = false;
    setIsLoadingSecondDegree(true);

    Promise.all(
      neighborKeys.map(async (key) => {
        const matched = resolveMatchedUser(key, undefined, users);
        const queryUserId = matched?.id || key;
        const [fwing, fwers] = await Promise.all([
          fetchUserFollowingOnce(queryUserId).catch(() => [] as AuthorFollowRecord[]),
          fetchAuthorFollowersOnce(key).catch(() => [] as AuthorFollowRecord[]),
        ]);
        return { key, fwing, fwers };
      })
    )
      .then((results) => {
        if (cancelled) return;
        const followingByKey: Record<string, AuthorFollowRecord[]> = {};
        const followersByKey: Record<string, AuthorFollowRecord[]> = {};
        for (const item of results) {
          followingByKey[item.key] = item.fwing;
          followersByKey[item.key] = item.fwers;
        }
        setSecondDegreeEdges({ followingByKey, followersByKey });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSecondDegree(false);
      });

    return () => {
      cancelled = true;
    };
  }, [includeSecondDegree, followingRecords, followerRecords, rootKey, users]);

  // Build normalized graph nodes & links
  const graphData = useMemo(() => {
    const nodeMap = new Map<string, SocialGraphNode>();
    const followingSet = new Set<string>();
    const followerSet = new Set<string>();

    const rootMatched = resolveMatchedUser(rootUserId || rootKey, rootUserName, users);
    const resolvedRootAvatar =
      rootUserAvatar ||
      (rootMatched?.avatar && isCustomUploadedAvatar(rootMatched.avatar) ? rootMatched.avatar : undefined);

    nodeMap.set(rootKey, {
      id: rootKey,
      name: rootUserName || rootMatched?.name || 'Uporabnik',
      avatar: resolvedRootAvatar,
      role: rootUserRole || rootMatched?.role,
      relation: 'root',
      degree: 0,
      userId: rootUserId || rootMatched?.id || rootKey,
      isVerified: isUserVerified({
        role: rootUserRole || rootMatched?.role,
        name: rootUserName,
        userId: rootUserId || rootMatched?.id,
        users,
      }),
    });

    for (const rec of followingRecords) {
      const targetKey = normalizeAuthorFollowKey(rec.authorId || rec.id, rec.authorName);
      if (!targetKey || targetKey === rootKey) continue;
      followingSet.add(targetKey);
      const matched = resolveMatchedUser(targetKey, rec.authorName, users);
      const existing = nodeMap.get(targetKey);
      const cleanAvatar =
        (rec.authorAvatar && isCustomUploadedAvatar(rec.authorAvatar) ? rec.authorAvatar : undefined) ||
        (matched?.avatar && isCustomUploadedAvatar(matched.avatar) ? matched.avatar : undefined) ||
        existing?.avatar;

      nodeMap.set(targetKey, {
        id: targetKey,
        name: matched?.name || rec.authorName || existing?.name || 'Avtor',
        avatar: cleanAvatar,
        role: matched?.role || existing?.role,
        relation: 'following',
        degree: 0,
        userId: matched?.id || rec.authorId || targetKey,
        isVerified: isUserVerified({
          role: matched?.role,
          name: matched?.name || rec.authorName,
          userId: matched?.id || rec.authorId,
          users,
        }),
      });
    }

    for (const rec of followerRecords) {
      const sourceKey = normalizeAuthorFollowKey(rec.followerId || rec.id, rec.followerName);
      if (!sourceKey || sourceKey === rootKey) continue;
      followerSet.add(sourceKey);
      const matched = resolveMatchedUser(sourceKey, rec.followerName, users);
      const existing = nodeMap.get(sourceKey);
      const cleanAvatar =
        (matched?.avatar && isCustomUploadedAvatar(matched.avatar) ? matched.avatar : undefined) ||
        existing?.avatar;

      const isMutual = followingSet.has(sourceKey);
      nodeMap.set(sourceKey, {
        id: sourceKey,
        name: matched?.name || rec.followerName || existing?.name || 'Uporabnik',
        avatar: cleanAvatar,
        role: matched?.role || existing?.role,
        relation: isMutual ? 'mutual' : 'follower',
        degree: 0,
        userId: matched?.id || rec.followerId || sourceKey,
        isVerified: isUserVerified({
          role: matched?.role,
          name: matched?.name || rec.followerName,
          userId: matched?.id || rec.followerId,
          users,
        }),
      });
    }

    // Also update mutual classification if following was processed first
    for (const key of followingSet) {
      if (followerSet.has(key)) {
        const n = nodeMap.get(key);
        if (n) n.relation = 'mutual';
      }
    }

    const linkMap = new Map<string, SocialGraphLink>();
    const addLink = (source: string, target: string, kind: SocialGraphLink['kind']) => {
      if (!source || !target || source === target) return;
      const forwardId = `${source}->${target}`;
      const reverseId = `${target}->${source}`;
      if (linkMap.has(forwardId)) return;
      if (linkMap.has(reverseId)) {
        const rev = linkMap.get(reverseId)!;
        rev.kind = 'mutual';
        return;
      }
      linkMap.set(forwardId, { id: forwardId, source, target, kind });
    };

    // 1st-degree directed edges
    for (const targetKey of followingSet) {
      addLink(rootKey, targetKey, followerSet.has(targetKey) ? 'mutual' : 'following');
    }
    for (const sourceKey of followerSet) {
      addLink(sourceKey, rootKey, followingSet.has(sourceKey) ? 'mutual' : 'follower');
    }

    // 2nd-degree edges
    if (includeSecondDegree) {
      let secondDegreeCount = 0;
      const maxSecondDegreeNodes = 18;

      for (const [neighborKey, fwingList] of Object.entries(secondDegreeEdges.followingByKey)) {
        if (!nodeMap.has(neighborKey)) continue;
        for (const rec of fwingList) {
          const targetKey = normalizeAuthorFollowKey(rec.authorId || rec.id, rec.authorName);
          if (!targetKey || targetKey === neighborKey) continue;
          if (!nodeMap.has(targetKey)) {
            if (secondDegreeCount >= maxSecondDegreeNodes) continue;
            secondDegreeCount += 1;
            const matched = resolveMatchedUser(targetKey, rec.authorName, users);
            nodeMap.set(targetKey, {
              id: targetKey,
              name: matched?.name || rec.authorName || 'Uporabnik',
              avatar:
                (rec.authorAvatar && isCustomUploadedAvatar(rec.authorAvatar) ? rec.authorAvatar : undefined) ||
                (matched?.avatar && isCustomUploadedAvatar(matched.avatar) ? matched.avatar : undefined),
              role: matched?.role,
              relation: 'second-degree',
              degree: 0,
              userId: matched?.id || rec.authorId || targetKey,
              isVerified: isUserVerified({
                role: matched?.role,
                name: matched?.name || rec.authorName,
                userId: matched?.id || rec.authorId,
                users,
              }),
            });
          }
          addLink(neighborKey, targetKey, targetKey === rootKey ? 'follower' : 'network');
        }
      }

      for (const [neighborKey, fwerList] of Object.entries(secondDegreeEdges.followersByKey)) {
        if (!nodeMap.has(neighborKey)) continue;
        for (const rec of fwerList) {
          const sourceKey = normalizeAuthorFollowKey(rec.followerId || rec.id, rec.followerName);
          if (!sourceKey || sourceKey === neighborKey) continue;
          if (!nodeMap.has(sourceKey)) {
            if (secondDegreeCount >= maxSecondDegreeNodes) continue;
            secondDegreeCount += 1;
            const matched = resolveMatchedUser(sourceKey, rec.followerName, users);
            nodeMap.set(sourceKey, {
              id: sourceKey,
              name: matched?.name || rec.followerName || 'Uporabnik',
              avatar: matched?.avatar && isCustomUploadedAvatar(matched.avatar) ? matched.avatar : undefined,
              role: matched?.role,
              relation: 'second-degree',
              degree: 0,
              userId: matched?.id || rec.followerId || sourceKey,
              isVerified: isUserVerified({
                role: matched?.role,
                name: matched?.name || rec.followerName,
                userId: matched?.id || rec.followerId,
                users,
              }),
            });
          }
          addLink(sourceKey, neighborKey, sourceKey === rootKey ? 'following' : 'network');
        }
      }
    }

    // Apply filter mode
    const allNodes = Array.from(nodeMap.values());
    const allowedNodeIds = new Set<string>([rootKey]);
    for (const node of allNodes) {
      if (node.id === rootKey) continue;
      if (filterMode === 'all') {
        allowedNodeIds.add(node.id);
      } else if (filterMode === 'mutual' && node.relation === 'mutual') {
        allowedNodeIds.add(node.id);
      } else if (filterMode === 'following' && (node.relation === 'following' || node.relation === 'mutual')) {
        allowedNodeIds.add(node.id);
      } else if (filterMode === 'follower' && (node.relation === 'follower' || node.relation === 'mutual')) {
        allowedNodeIds.add(node.id);
      }
    }

    const filteredNodes = allNodes.filter((n) => allowedNodeIds.has(n.id));
    const filteredLinks = Array.from(linkMap.values()).filter(
      (l) => allowedNodeIds.has(String(l.source)) && allowedNodeIds.has(String(l.target))
    );

    // Compute visible degrees
    const degreeCounts = new Map<string, number>();
    for (const link of filteredLinks) {
      const s = String(link.source);
      const t = String(link.target);
      degreeCounts.set(s, (degreeCounts.get(s) || 0) + 1);
      degreeCounts.set(t, (degreeCounts.get(t) || 0) + 1);
    }
    for (const node of filteredNodes) {
      node.degree = degreeCounts.get(node.id) || 0;
    }

    return {
      nodes: filteredNodes,
      links: filteredLinks,
      stats: {
        mutual: allNodes.filter((n) => n.relation === 'mutual').length,
        following: allNodes.filter((n) => n.relation === 'following' || n.relation === 'mutual').length,
        followers: allNodes.filter((n) => n.relation === 'follower' || n.relation === 'mutual').length,
        secondDegree: allNodes.filter((n) => n.relation === 'second-degree').length,
      },
    };
  }, [
    rootKey,
    rootUserId,
    rootUserName,
    rootUserAvatar,
    rootUserRole,
    users,
    followingRecords,
    followerRecords,
    secondDegreeEdges,
    includeSecondDegree,
    filterMode,
  ]);

  // Quick discovery suggestions (real users from directory not yet followed)
  const suggestedUsers = useMemo(() => {
    const connectedIds = new Set(graphData.nodes.map((n) => n.id));
    return users
      .filter((u) => {
        if (u.status === 'banned' || u.role === 'guest') return false;
        const key = normalizeAuthorFollowKey(u.id, u.name);
        if (key === rootKey || u.id === currentUser?.id) return false;
        return !connectedIds.has(key);
      })
      .slice(0, 4);
  }, [users, graphData.nodes, rootKey, currentUser?.id]);

  // Keep selectedNodeId synced if node disappears on filter change
  const selectedNode = useMemo(
    () => graphData.nodes.find((n) => n.id === selectedNodeId) || null,
    [graphData.nodes, selectedNodeId]
  );

  // D3 force simulation + rendering
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const { width, height } = canvasSize;
    const svg = d3.select<SVGSVGElement, unknown>(svgEl);
    svg.selectAll('*').remove();

    const simNodes: SocialGraphNode[] = graphData.nodes.map((n) => ({
      ...n,
      x: n.id === rootKey ? width / 2 : undefined,
      y: n.id === rootKey ? height / 2 : undefined,
    }));
    const simLinks: SocialGraphLink[] = graphData.links.map((l) => ({ ...l }));

    // SVG Definitions: arrowhead markers + avatar clipPaths
    const defs = svg.append('defs');

    const markerConfigs: Array<{ id: string; color: string }> = [
      { id: 'arrow-following', color: '#0284c7' },
      { id: 'arrow-follower', color: '#006c4a' },
      { id: 'arrow-mutual', color: '#7c3aed' },
      { id: 'arrow-network', color: '#94a3b8' },
    ];

    for (const mk of markerConfigs) {
      defs
        .append('marker')
        .attr('id', mk.id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 24)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4Z')
        .attr('fill', mk.color);
    }

    simNodes.forEach((n, idx) => {
      const r = getNodeRadius(n) - 2.5;
      defs
        .append('clipPath')
        .attr('id', `social-clip-${idx}`)
        .append('circle')
        .attr('r', r)
        .attr('cx', 0)
        .attr('cy', 0);
    });

    const viewport = svg.append('g').attr('class', 'social-graph-viewport');

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.45, 2.8])
      .on('zoom', (event) => {
        viewport.attr('transform', event.transform.toString());
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Click background canvas clears selection
    svg.on('click', (event) => {
      if (event.target === svgEl) {
        setSelectedNodeId(null);
      }
    });

    // Links group
    const linkLayer = viewport.append('g').attr('class', 'social-links');
    const linkLines = linkLayer
      .selectAll<SVGLineElement, SocialGraphLink>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', (d) =>
        d.kind === 'mutual'
          ? '#7c3aed'
          : d.kind === 'following'
          ? '#0284c7'
          : d.kind === 'follower'
          ? '#006c4a'
          : '#94a3b8'
      )
      .attr('stroke-width', (d) => (d.kind === 'mutual' ? 2.2 : d.kind === 'network' ? 1.3 : 1.8))
      .attr('stroke-dasharray', (d) => (d.kind === 'network' ? '4 3' : ''))
      .attr('stroke-opacity', 0.72)
      .attr('marker-end', (d) =>
        d.kind === 'mutual'
          ? 'url(#arrow-mutual)'
          : d.kind === 'following'
          ? 'url(#arrow-following)'
          : d.kind === 'follower'
          ? 'url(#arrow-follower)'
          : 'url(#arrow-network)'
      );

    // Nodes group
    const nodeLayer = viewport.append('g').attr('class', 'social-nodes');
    const nodeGroups = nodeLayer
      .selectAll<SVGGElement, SocialGraphNode>('g')
      .data(simNodes, (d) => d.id)
      .join('g')
      .attr('class', 'cursor-pointer')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => `${d.name} (${NODE_COLORS[d.relation].label})`);

    // Outer halo ring for root / mutual
    nodeGroups
      .filter((d) => d.relation === 'root' || d.relation === 'mutual')
      .append('circle')
      .attr('r', (d) => getNodeRadius(d) + 5)
      .attr('fill', 'none')
      .attr('stroke', (d) => NODE_COLORS[d.relation].fill)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', (d) => (d.relation === 'root' ? '' : '3 2'));

    // Main node circle
    nodeGroups
      .append('circle')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', (d) => NODE_COLORS[d.relation].fill)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5);

    // Initials text inside circle (shown behind avatar or when no avatar)
    nodeGroups
      .append('text')
      .text((d) => getUserInitials(d.name))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#ffffff')
      .attr('font-size', (d) => (d.relation === 'root' ? '12px' : '10px'))
      .attr('font-weight', '700')
      .attr('pointer-events', 'none');

    // Avatar image clipped cleanly if present
    nodeGroups.each(function (d, idx) {
      if (!d.avatar) return;
      const r = getNodeRadius(d) - 2.5;
      const g = d3.select(this);
      const img = g
        .append('image')
        .attr('href', d.avatar)
        .attr('x', -r)
        .attr('y', -r)
        .attr('width', r * 2)
        .attr('height', r * 2)
        .attr('clip-path', `url(#social-clip-${idx})`)
        .attr('preserveAspectRatio', 'xMidYMid slice');
      img.on('error', function () {
        d3.select(this).remove();
      });
    });

    // Verified mini-badge indicator on verified nodes
    nodeGroups
      .filter((d) => Boolean(d.isVerified))
      .append('circle')
      .attr('cx', (d) => getNodeRadius(d) * 0.72)
      .attr('cy', (d) => -getNodeRadius(d) * 0.72)
      .attr('r', 5)
      .attr('fill', '#0284c7')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    // Name label underneath node
    nodeGroups
      .append('text')
      .text((d) => (d.name.length > 18 ? `${d.name.slice(0, 17)}…` : d.name))
      .attr('y', (d) => getNodeRadius(d) + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .attr('font-size', (d) => (d.relation === 'root' ? '12px' : '11px'))
      .attr('font-weight', (d) => (d.relation === 'root' ? '700' : '600'))
      .attr('class', 'text-on-surface select-none pointer-events-none');

    // Force Simulation
    const simulation = d3
      .forceSimulation<SocialGraphNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SocialGraphNode, SocialGraphLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => (d.kind === 'network' ? 130 : 108))
          .strength(0.65)
      )
      .force(
        'charge',
        d3.forceManyBody<SocialGraphNode>().strength((d) => (d.relation === 'root' ? -380 : -240))
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3
          .forceCollide<SocialGraphNode>()
          .radius((d) => getNodeRadius(d) + 22)
          .iterations(2)
      )
      .force('x', d3.forceX<SocialGraphNode>(width / 2).strength(0.06))
      .force('y', d3.forceY<SocialGraphNode>(height / 2).strength(0.06));

    // Drag behavior
    const dragBehavior = d3
      .drag<SVGGElement, SocialGraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.28).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroups.call(dragBehavior);

    nodeGroups
      .on('mouseenter', (_event, d) => {
        setHoveredNodeId(d.id);
      })
      .on('mouseleave', () => {
        setHoveredNodeId(null);
      })
      .on('click', (event, d) => {
        if (event.defaultPrevented) return;
        event.stopPropagation();
        setSelectedNodeId((prev) => (prev === d.id ? null : d.id));
      })
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setSelectedNodeId((prev) => (prev === d.id ? null : d.id));
        }
      });

    simulation.on('tick', () => {
      linkLines
        .attr('x1', (d) => (d.source as SocialGraphNode).x ?? width / 2)
        .attr('y1', (d) => (d.source as SocialGraphNode).y ?? height / 2)
        .attr('x2', (d) => (d.target as SocialGraphNode).x ?? width / 2)
        .attr('y2', (d) => (d.target as SocialGraphNode).y ?? height / 2);

      nodeGroups.attr('transform', (d) => `translate(${d.x ?? width / 2},${d.y ?? height / 2})`);
    });

    selectionRefs.current = { nodeGroups, linkLines, width, height };

    return () => {
      simulation.stop();
    };
  }, [graphData.nodes, graphData.links, canvasSize, rootKey]);

  // Smooth highlight pass without restarting D3 physics
  useEffect(() => {
    const { nodeGroups, linkLines } = selectionRefs.current;
    if (!nodeGroups || !linkLines) return;

    const focusId = hoveredNodeId || selectedNodeId;
    const normalizedSearch = searchQuery.trim().toLowerCase();

    if (!focusId && !normalizedSearch) {
      nodeGroups.attr('opacity', 1);
      linkLines.attr('stroke-opacity', 0.72);
      return;
    }

    const connectedToFocus = new Set<string>();
    if (focusId) {
      connectedToFocus.add(focusId);
      linkLines.each((l) => {
        const s = typeof l.source === 'string' ? l.source : l.source.id;
        const t = typeof l.target === 'string' ? l.target : l.target.id;
        if (s === focusId) connectedToFocus.add(t);
        if (t === focusId) connectedToFocus.add(s);
      });
    }

    nodeGroups.attr('opacity', (d) => {
      const matchesSearch = !normalizedSearch || d.name.toLowerCase().includes(normalizedSearch);
      const matchesFocus = !focusId || connectedToFocus.has(d.id);
      return matchesSearch && matchesFocus ? 1 : 0.2;
    });

    linkLines.attr('stroke-opacity', (l) => {
      if (!focusId) return normalizedSearch ? 0.25 : 0.72;
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      return s === focusId || t === focusId ? 0.95 : 0.14;
    });
  }, [hoveredNodeId, selectedNodeId, searchQuery]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy, 1.25);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy, 0.8);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(260)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const inspectedNode =
    selectedNode ||
    (hoveredNodeId ? graphData.nodes.find((n) => n.id === hoveredNodeId) || null : null);

  const hasDirectConnections = graphData.stats.following > 0 || graphData.stats.followers > 0;

  return (
    <section
      className={`bg-surface-container-lowest rounded-2xl border border-surface-container/60 shadow-xs overflow-hidden flex flex-col ${className}`}
      aria-label="Interaktivno omrežje socialnih povezav"
    >
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-surface-container-low flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface leading-tight">
                Socialno omrežje povezav
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Interaktivni prikaz sledilcev, sledenj in skupnih povezav (povlecite vozlišča ali povečajte graf)
              </p>
            </div>
          </div>

          {/* Graph Metrics Summary (tabular-nums) */}
          <div className="flex items-center gap-3 text-xs text-on-surface-variant font-label-md shrink-0">
            <span className="tabular-nums">
              <strong className="text-on-surface">{graphData.nodes.length}</strong> vozlišč
            </span>
            <span aria-hidden="true" className="text-outline">·</span>
            <span className="tabular-nums">
              <strong className="text-on-surface">{graphData.links.length}</strong> povezav
            </span>
          </div>
        </div>

        {/* Interactive Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Segmented Relation Filter */}
          <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-surface-container/50 flex-wrap">
            {(
              [
                { id: 'all', label: 'Vse' },
                { id: 'mutual', label: `Vzajemne (${graphData.stats.mutual})` },
                { id: 'following', label: `Sledi (${graphData.stats.following})` },
                { id: 'follower', label: `Sledilci (${graphData.stats.followers})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                  filterMode === tab.id
                    ? 'bg-surface-container-lowest text-primary shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Node */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Poišči uporabnika..."
                aria-label="Poišči uporabnika v grafu"
                className="pl-7 pr-6 py-1.5 text-xs rounded-xl bg-surface-container-low border border-surface-container text-on-surface placeholder:text-outline focus:outline-none focus:border-primary w-40 sm:w-44"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-outline hover:text-on-surface cursor-pointer"
                  aria-label="Počisti iskanje"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 2nd-degree network toggle */}
            <button
              type="button"
              onClick={() => setIncludeSecondDegree((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                includeSecondDegree
                  ? 'bg-primary/10 text-primary border-primary/25'
                  : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:text-on-surface'
              }`}
              title="Prikaži ali skrij povezave 2. stopnje"
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. stopnja</span>
              {isLoadingSecondDegree && (
                <span className="text-[10px] opacity-75">…</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive D3 Canvas + Node Inspector */}
      <div className="relative flex flex-col lg:flex-row">
        <div
          ref={containerRef}
          className="relative flex-1 bg-surface-container-low/35 min-h-[360px] lg:min-h-[440px]"
        >
          <svg
            ref={svgRef}
            width={canvasSize.width}
            height={canvasSize.height}
            viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            className="w-full h-full block touch-none"
          />

          {/* Zoom Controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1 bg-surface-container-lowest/90 backdrop-blur-xs border border-surface-container rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer"
              title="Povečaj graf"
              aria-label="Povečaj graf"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer"
              title="Pomanjšaj graf"
              aria-label="Pomanjšaj graf"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors cursor-pointer"
              title="Ponastavi pogled"
              aria-label="Ponastavi pogled"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Empty Connections Helper Overlay */}
          {!hasDirectConnections && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
              <div className="pointer-events-auto max-w-md bg-surface-container-lowest/95 backdrop-blur-xs border border-surface-container rounded-2xl px-4 py-3 shadow-sm text-center">
                <p className="text-xs font-semibold text-on-surface">
                  Omrežje tega profila še nima zabeleženih povezav.
                </p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Ko sledite uporabnikom ali pridobite sledilce, se tukaj samodejno izriše interaktivni graf povezav.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right / Bottom Inspector Panel */}
        <aside className="lg:w-72 border-t lg:border-t-0 lg:border-l border-surface-container-low bg-surface-container-lowest p-4 flex flex-col justify-between gap-4">
          {inspectedNode ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar
                    src={inspectedNode.avatar}
                    name={inspectedNode.name}
                    userId={inspectedNode.userId}
                    role={inspectedNode.role}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-bold text-on-surface truncate">
                        {inspectedNode.name}
                      </h3>
                      {inspectedNode.isVerified && <VerifiedBadge size="sm" />}
                    </div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                        NODE_COLORS[inspectedNode.relation].badgeBg
                      }`}
                    >
                      {NODE_COLORS[inspectedNode.relation].label}
                    </span>
                  </div>
                </div>
                {selectedNodeId && (
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
                    aria-label="Zapri podrobnosti vozlišča"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-surface-container-low/70 border border-surface-container/50 flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">Povezav v grafu</span>
                <span className="font-bold text-on-surface tabular-nums">{inspectedNode.degree}</span>
              </div>

              {inspectedNode.id !== rootKey && (
                <div className="flex flex-col gap-2 pt-1">
                  <FollowAuthorButton
                    authorId={inspectedNode.userId || inspectedNode.id}
                    authorName={inspectedNode.name}
                    authorAvatar={inspectedNode.avatar}
                    showFollowerCount={true}
                    className="w-full justify-center"
                  />
                  {onAuthorClick && (
                    <button
                      type="button"
                      onClick={() =>
                        onAuthorClick({
                          id: inspectedNode.userId || inspectedNode.id,
                          name: inspectedNode.name,
                          avatar: inspectedNode.avatar,
                          role: inspectedNode.role,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-surface-container/60"
                    >
                      <span>Odpri profil</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-xs text-on-surface-variant">
              <div className="flex items-center gap-1.5 font-bold text-on-surface">
                <UserCheck className="w-4 h-4 text-primary" />
                <span>Inšpektor vozlišča</span>
              </div>
              <p className="leading-relaxed">
                Premaknite kazalec nad vozlišče ali ga kliknite, da izpostavite njegove neposredne povezave in odprete profil uporabnika.
              </p>
            </div>
          )}

          {/* Community Discovery Chips when user can add more connections */}
          {suggestedUsers.length > 0 && (
            <div className="pt-3 border-t border-surface-container-low flex flex-col gap-2">
              <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                <span>Odkrij uporabnike skupnosti</span>
              </span>
              <div className="flex flex-col gap-1.5">
                {suggestedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-container-low/60 border border-surface-container/50"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onAuthorClick?.({
                          id: u.id,
                          name: u.name,
                          avatar: u.avatar,
                          role: u.role,
                        })
                      }
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
                    >
                      <UserAvatar src={u.avatar} name={u.name} userId={u.id} role={u.role} size="xs" />
                      <span className="text-xs font-semibold text-on-surface group-hover:text-primary truncate">
                        {u.name}
                      </span>
                    </button>
                    <FollowAuthorButton
                      authorId={u.id}
                      authorName={u.name}
                      authorAvatar={u.avatar}
                      compact={true}
                      showFollowerCount={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="pt-3 border-t border-surface-container-low grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006194] shrink-0" />
              <span className="truncate">Središče</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed] shrink-0" />
              <span className="truncate">Vzajemno</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] shrink-0" />
              <span className="truncate">Sledi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006c4a] shrink-0" />
              <span className="truncate">Sledilec</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748b] shrink-0" />
              <span className="truncate">Omrežje 2. stopnje</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
