import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Explicit publication manifest. The CKP contains hundreds of working notes,
// including malformed or incomplete frontmatter that must never break a site
// build merely by existing. A file must be listed here AND declare publish:true.
export const PUBLISHED_SOURCES = [
  'Capital/Externalization.md',
  'Case Studies/Rural California Political Economy/Disadvantaged Unincorporated Communities.md',
  'Case Studies/Rural California Political Economy/Nitrate and Arsenic Contamination in Disadvantaged Communities.md',
  'Case Studies/Rural California Political Economy/Pesticide Exposure in the San Joaquin Valley.md',
  'Case Studies/Rural California Political Economy/San Joaquin Valley Air Quality.md',
  'Case Studies/Rural California Political Economy/Human Right to Water.md',

  'Case Studies/Rural California Political Economy/The Bill Comes Due in the Body - Health and Environmental Costs in the San Joaquin Valley.md',
];

const entries = defineCollection({
  loader: glob({ pattern: PUBLISHED_SOURCES, base: '../..' }),
  schema: z.object({
    title: z.string().optional(),
    domain: z.string().optional(),
    status: z.string().optional(),
    publish: z.boolean().optional(),
    entry_number: z.number().optional(),
    dek: z.string().optional(),
    published: z.union([z.string(), z.date()]).optional(),
    revised: z.union([z.string(), z.date()]).optional(),
    format: z.string().optional(),
    audience: z.array(z.string()).optional(),
    'output-channel': z.string().optional(),
    aliases: z.union([z.string(), z.array(z.string())]).optional(),
  }).passthrough(),
});
export const collections = { entries };
