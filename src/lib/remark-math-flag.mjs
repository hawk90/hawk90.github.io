import { visit, EXIT } from 'unist-util-visit';

// Mark posts that contain math so the page loads KaTeX's stylesheet only
// where it is needed. This runs after remark-math, so it sees exactly the
// nodes rehype-katex will render: block `math` and `inlineMath` alike. The
// page used to guess from the raw body with a regex that missed `$…$`,
// leaving inline formulas unstyled.
export default function remarkMathFlag() {
  return (tree, file) => {
    let hasMath = false;
    visit(tree, (node) => {
      if (node.type === 'math' || node.type === 'inlineMath') {
        hasMath = true;
        return EXIT;
      }
    });
    file.data.astro ??= {};
    file.data.astro.frontmatter ??= {};
    file.data.astro.frontmatter.hasMath = hasMath;
  };
}
