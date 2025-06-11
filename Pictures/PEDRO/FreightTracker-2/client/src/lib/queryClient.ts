import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.PROD 
  ? "https://logmene.tech" 
  : "http://localhost:3000";

// ... existing code ... 