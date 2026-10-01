import { z } from "zod";

export const lookupResultSchema = z.object({
  ip: z.string().min(1),
  location: z.object({
    city: z.string().default(""),
    region: z.string().default(""),
    country: z.string().default(""),
    postalCode: z.string().default(""),
    timezone: z.string().default(""),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  isp: z.string().default("Unknown network"),
});

export type LookupResult = z.infer<typeof lookupResultSchema>;
