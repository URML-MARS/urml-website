// RSS feed for the blog. Honest description: "Notes on robotics, with
// occasional URML." No promise of daily cadence — that's not measured yet.
// Includes summary as description, not full body (drives traffic to site).
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: "URML — Notes",
    description: "Notes on robotics, with occasional URML.",
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      link: `/blog/${post.slug.replace(/^\d{4}-\d{2}-\d{2}-/, "")}/`,
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: `<language>en-us</language>`,
  });
}
