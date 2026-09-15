for file in src/components/posts/*.tsx; do
  # Add import
  sed -i '1i import { BookmarkButton } from "../BookmarkButton";' "$file"
  
  # Change function signature
  sed -i 's/export function \(.*\)(.*)/export function \1({ id = "default" }: { id?: string })/' "$file"
  
  # Add BookmarkButton before the MoreHorizontal button
  sed -i 's/<button className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container" type="button">/<BookmarkButton id={id} \/>\n          <button className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container" type="button">/' "$file"
done
