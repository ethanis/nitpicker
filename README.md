# Nitpicker

The Nitpicker is a GitHub Action that allows you to configure comments to automatically add to pull requests if a PR contains changes matching a specified file pattern. This helps teams control code quality and ensure that changes take downstream effects into account. These comments can optionally block a PR from completing until they've been resolved.

## Getting started

Add a new YAML file that specifies the comments to be evaluated during PRs. We recommend placing this file at `.github/nitpicks.yml`.

```yaml
- markdown: |
    ## Rockstar alert
    Thanks for this contribution, we _really_ appreciate your help :heart:!
  pathFilter:
    - '*'
- markdown: |
    ## Uh oh
    Don't check in binaries...we use GitHub Packages for those!
  blocking: true
  pathFilter:
    - '+**/*.dll'
```

Add the Nitpicker action to your workflow and allow access to the `secrets.GITHUB_TOKEN` variable.

```yaml
    steps:
      ...
      - uses: mobile-actions/nitpicker@v1
        with:
          nitpicks: '.github/nitpicks.yml'
          token: '${{ secrets.GITHUB_TOKEN }}'
```

## Blocking comments

A blocking comment indicates that a PR containing changed files that match a specified path filter will be blocked from being completed. After the indicated file/folder has been removed from the PR, the blocking comment will be considered 'resolved' and the PR can be completed.

## Common use-cases

To help clarify when to use which kind of comment, let's examine the following use-cases:

### Blocking

You may want to use a blocking comment to ensure that no binaries are checked into the repository. For example, the following blocking comment could be configured with a path filter of `**/*.dll`:

```markdown
You added or modified a .dll in this PR. You will **not** be able to complete this PR until the binary is removed.

Our new convention is to package binaries with NuGet packages. More information can be found [here](https://teamwiki.co/nuget).
```

In order for this PR to be completed, the author of the PR will need to remove the binary from the set of files included in the PR.

### Non-blocking

You may want to use a non-blocking comment to ensure changes of application-critical files address all business concerns. For example, the following non-blocking comment could be configured with a path filter of `src/payments/**`:

```markdown
You modified a file that controls the payment processing for the company. Please ensure that you have completed all of the following:

- [ ] Added unit tests to verify changes
- [ ] Tested change in multiple web browsers (Chrome, Firefox, Safari, and Edge)
- [ ] Updated documentation with any API changes
```

In order for this PR to be completed, the author of the PR should address any concerns that the comment surfaces.

## Path filters

Path filters define which comments to add to a PR based on the set of files changed. These can either be explicit file paths or a file path pattern. If you want to add multiple path filters to a comment, they must be separated with a `,` or `;`. Comments will only be added to a PR if it changes files that match the path filter.

Paths prefixed with `!` are excluded. For example, `!tests/**` will exclude files changed within the `tests/` directory.

Paths prefixed with `+` indicate only _new_ files will match. For example, `+depot/*.dll` will match when a file with the file extension `.dll` is added to the `depot/` directory but would not match when an existing `.dll` is edited or deleted in the `depot/` directory.

Paths prefixed with `-` indicate only _removed_ files will match. For example, `-docs/*.md` will match when a file with the file extension `.md` is deleted from the `docs/` directory, but would not match when a `.md` file is added or edited in the `docs/` directory.

Paths prefixed with `~` indicate only _edited_ files will match. For example, `~sources/*.nupkg` will match when an existing file with the file extension `.nupkg` is edited in the `sources/` directory, but would not match when a `.nugpkg` file is added or deleted in the `sources/` directory.

## Development

Install the dependencies

```bash
$ npm install
```

Build the typescript

```bash
$ npm run build
```

Run the tests :heavy_check_mark:

```bash
$ npm test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```
