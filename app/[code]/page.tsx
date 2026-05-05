import ErrorDisplay, { ErrorInfo } from "./error-display";

const ERROR_MAP: Record<string, ErrorInfo> = {
  "400": { title: "Bad Request", message: "The server could not understand the request due to invalid syntax." },
  "401": { title: "Unauthorized", message: "Authentication is required and has failed or has not yet been provided." },
  "403": { title: "Forbidden", message: "Access to the requested resource is strictly denied." },
  "404": { title: "Not Found", message: "The requested resource could not be located on this server." },
  "500": { title: "Internal Server Error", message: "The server encountered an unexpected condition that prevented it from fulfilling the request." },
  "502": { title: "Bad Gateway", message: "The server received an invalid response from the upstream server." },
  "503": { title: "Service Unavailable", message: "The server is currently unable to handle the request." },
  "504": { title: "Gateway Timeout", message: "The gateway timed out while waiting for a response." },
};

export default async function ErrorPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const info = ERROR_MAP[code];
  if (!info) {
    return <ErrorDisplay code="404" info={ERROR_MAP["404"]} />;
  }

  return <ErrorDisplay code={code} info={info} />;
}
