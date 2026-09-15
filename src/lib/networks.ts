export type AffiliateNetwork = "amazon" | "clickbank" | "shareasale" | "impact" | "generic";

const cleanAsin = (raw: string) => {
  const value = raw.trim();
  if (!value) return "";
  const match = value.match(/(?:\/dp\/)?([A-Z0-9]{10})/i) ?? value.match(/([A-Z0-9]{10})/i);
  return match?.[1] ?? value.replace(/[^A-Z0-9]/gi, "").slice(0, 10);
};

export const buildAffiliateUrl = ({
  network,
  asin,
  destination,
  affiliateTag,
}: {
  network?: string;
  asin?: string;
  destination?: string;
  affiliateTag?: string;
}) => {
  const resolvedNetwork = (network || "amazon") as AffiliateNetwork;
  const tag = affiliateTag || process.env.AFFILIATE_TAG || "gblabs20-20";

  switch (resolvedNetwork) {
    case "amazon": {
      const clean = cleanAsin(asin || destination || "");
      return clean ? `https://www.amazon.com/dp/${clean}?tag=${tag}` : "";
    }
    case "clickbank": {
      const vendor = destination || "";
      return vendor ? `https://${tag}.${vendor}.hop.clickbank.net` : "";
    }
    case "shareasale": {
      const merchantId = destination || "";
      return merchantId ? `https://www.shareasale.com/r.cfm?b=1&u=${tag}&m=${merchantId}` : "";
    }
    case "impact": {
      return destination ? `${destination}${destination.includes("?") ? "&" : "?"}irclickid=${tag}` : "";
    }
    case "generic":
    default: {
      if (!destination) return "";
      try {
        const url = new URL(destination);
        url.searchParams.set("ref", tag);
        return url.toString();
      } catch {
        return destination;
      }
    }
  }
};

export const affiliateNetworks: { id: AffiliateNetwork; name: string; destinationLabel: string }[] = [
  { id: "amazon", name: "Amazon Associates", destinationLabel: "ASIN or product URL" },
  { id: "clickbank", name: "ClickBank", destinationLabel: "Vendor ID" },
  { id: "shareasale", name: "ShareASale", destinationLabel: "Merchant ID" },
  { id: "impact", name: "Impact", destinationLabel: "Tracking URL" },
  { id: "generic", name: "Generic / other network", destinationLabel: "Destination URL" },
];
