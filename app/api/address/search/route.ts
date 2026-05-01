import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env, hasMapboxConfig } from "@/lib/env";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

type MapboxFeature = {
  id: string;
  properties?: {
    full_address?: string;
    address?: string;
    name?: string;
    coordinates?: {
      longitude?: number;
      latitude?: number;
    };
  };
  context?: {
    place?: { name?: string };
    region?: { region_code?: string; name?: string };
    postcode?: { name?: string };
  };
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  if (!hasMapboxConfig()) {
    return NextResponse.json({ suggestions: [] });
  }

  const params = new URLSearchParams({
    q,
    access_token: env.mapboxAccessToken,
    autocomplete: "true",
    types: "address,street",
    limit: "8",
    country: "US",
    language: "en"
  });

  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`, {
    headers: {
      Accept: "application/json"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  const data = (await response.json()) as { features?: MapboxFeature[] };
  const suggestions =
    data.features?.map((feature) => {
      const address =
        feature.properties?.full_address ||
        [
          feature.properties?.address || feature.properties?.name || "",
          feature.context?.place?.name || "",
          feature.context?.region?.region_code || feature.context?.region?.name || "",
          feature.context?.postcode?.name || ""
        ]
          .filter(Boolean)
          .join(", ");
      const suggestionCity = feature.context?.place?.name || "";
      const suggestionState = feature.context?.region?.region_code || feature.context?.region?.name || "";
      const suggestionPostalCode = feature.context?.postcode?.name || "";

      return {
        id: feature.id,
        address,
        city: suggestionCity,
        state: suggestionState,
        postalCode: suggestionPostalCode,
        formatted: address
      };
    }).filter((item) => item.address) || [];

  return NextResponse.json({ suggestions });
}
