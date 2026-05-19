import "../../styles/skeleton.css";

export default function Skeleton({
  width = "100%",
  height = 14,
  className = "",
  circle = false,
  block = false,
  style = {},
}) {
  const classes = [
    "skeleton",
    block ? "skeleton--block" : "",
    circle ? "skeleton--circle" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      aria-hidden
    />
  );
}
