import { useQuery } from "@tanstack/react-query";

import { fetchHealth } from "./api/client";

function App() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <main className="app-shell">
      <h1>BasketStats</h1>
      <p>FIBA basketball stats, offline-first.</p>
      <p data-testid="api-status">
        API status:{" "}
        {isLoading ? "checking..." : isError ? "unreachable" : data?.status}
      </p>
    </main>
  );
}

export default App;
