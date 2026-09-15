for file in src/components/posts/*.tsx; do
  sed -i 's/export function \(.*\)(.*)/export const \1: React.FC<{ id?: string }> = ({ id = "default" }) =>/' "$file"
  sed -i '1i import React from "react";' "$file"
done
