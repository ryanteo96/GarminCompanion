# Home layout syncs as one Neon row, newest edit wins

The Home layout is stored whole in a single Neon `settings` row, with localStorage as the instant offline copy. On a conflict the layout with the newer `updatedAt` replaces the other entirely, on both client and server. We chose this over per-Tile merging because there is one user and conflicts are rare, so an edit on one device can silently overwrite a different edit made on another.

## Consequences

- Sign-out sends `Clear-Site-Data`, which wipes the local layout so nothing stays on a shared device. With Neon configured the layout returns on the next sign-in. Without Neon (dev, demo) the layout is lost on sign-out.
