# CONTRIBUTING.md

## Git workflow

Do not push directly to `main`.

For every non-trivial change:

1. Create or reference an Issue.
2. Create a working branch from `main`.
3. Use branch names like:
   - `fix/<issue-number>-<short-title>`
   - `feature/<issue-number>-<short-title>`
   - `docs/<issue-number>-<short-title>`
4. Commit changes to the working branch.
5. Push the branch.
6. Open a Pull Request.
7. Include `Closes #<issue-number>` in the PR body.
8. Review the diff before merging.
9. After merge, delete the branch.
