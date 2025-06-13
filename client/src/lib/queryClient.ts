import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE_URL = process.env.NODE_ENV === "production" ? "https://api.logmene.tech" : "http://localhost:3000";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const fullUrl = `${API_BASE_URL}${url}`;
  console.log(`Making ${method} request to ${fullUrl}`, data);
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`API Error (${res.status}):`, errorText);
    throw new Error(errorText || res.statusText);
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn = <T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> => {
  return async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const fullUrl = `${API_BASE_URL}${url}`;
    console.log(`Making GET request to ${fullUrl}`);

    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (options.on401 === "returnNull" && res.status === 401) {
      return null as T;
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error (${res.status}):`, errorText);
      throw new Error(errorText || res.statusText);
    }

    return await res.json();
  };
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
