import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

// Turbopack requires remark/rehype plugins as string names (functions can't
// cross into Rust). GFM gives us tables, strikethrough, autolinks.
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // frontmatter: strip the YAML --- block so it isn't rendered as body text.
    // gfm: tables, strikethrough, autolinks.
    remarkPlugins: ["remark-frontmatter", "remark-gfm"],
  },
});

export default withMDX(nextConfig);
