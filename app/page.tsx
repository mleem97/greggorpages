import ErrorDisplay from "./[code]/error-display";

export default function HomePage() {
  return (
    <ErrorDisplay
      code="404"
      info={{
        title: "Not Found",
        message: "The requested resource could not be located on this server.",
      }}
    />
  );
}
