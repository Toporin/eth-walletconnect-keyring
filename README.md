# eth-walletconnect-keyring

Keyring wrapper on [walletconnect v1.0](https://docs.walletconnect.com/).

An implementation of MetaMask's [Keyring interface](https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol), that uses the WalletConnect  protocol to send request to a wallet client for all cryptographic operations.
When using a WalletConnect keyring for performing some actions, MetaMask will open a new tab which will allow the user to initiate a WalletConnect connection to a compatible wallet such as [Satochip-Bridge](https://github.com/Toporin/Satochip-Bridge).
The new tab opens a react application ([WalletConnect-Bridge](https://github.com/Toporin/WalletConnect-Bridge)) that will manage the WalletConnect connection.

This keyring supports the following requests:
- `signMessage`, `signPersonalMessage`, `signTypedData` methods
- `signTransaction` with legacy and EIP1559 format

It does not support:
- `exportAccount`

## Compatible wallets

- [Satochip-Bridge](https://github.com/Toporin/Satochip-Bridge)

If your wallet is compatible, feel free to create a pull request to add your wallet on the list.

## Using

In addition to all the known methods from the [Keyring class protocol](https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol),
there are a few others:

- **isUnlocked** : Returns true if we have the public key in memory, which allows to generate the list of accounts at any time

- **unlock** : Connects to WalletConnect and the list of accounts (addresses) managed.

- **setAccountToUnlock** : the index of the account that you want to unlock in order to use with the signTransaction and signPersonalMessage methods

- **getFirstPage** : returns the first ordered set of accounts from the TREZOR account

- **getNextPage** : returns the next ordered set of accounts from the TREZOR account based on the current page

- **getPreviousPage** : returns the previous ordered set of accounts from the TREZOR account based on the current page

- **forgetDevice** : removes all the device info from memory

## Contributing

### Setup

- Install [Node.js](https://nodejs.org) version 12
  - If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm use` will automatically choose the right node version for you.
- Install [Yarn v1](https://yarnpkg.com/en/docs/install)
- Run `yarn setup` to install dependencies and run any requried post-install scripts
  - **Warning:** Do not use the `yarn` / `yarn install` command directly. Use `yarn setup` instead. The normal install command will skip required post-install scripts, leaving your development environment in an invalid state.

### Testing and Linting

Run `yarn test` to run the tests.

Run `yarn lint` to run the linter, or run `yarn lint:fix` to run the linter and fix any automatically fixable issues.

### Release & Publishing

The project follows the same release process as the other libraries in the MetaMask organization. The GitHub Actions [`action-create-release-pr`](https://github.com/MetaMask/action-create-release-pr) and [`action-publish-release`](https://github.com/MetaMask/action-publish-release) are used to automate the release process; see those repositories for more information about how they work.

1. Choose a release version.

   - The release version should be chosen according to SemVer. Analyze the changes to see whether they include any breaking changes, new features, or deprecations, then choose the appropriate SemVer version. See [the SemVer specification](https://semver.org/) for more information.

2. If this release is backporting changes onto a previous release, then ensure there is a major version branch for that version (e.g. `1.x` for a `v1` backport release).

   - The major version branch should be set to the most recent release with that major version. For example, when backporting a `v1.0.2` release, you'd want to ensure there was a `1.x` branch that was set to the `v1.0.1` tag.

3. Trigger the [`workflow_dispatch`](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#workflow_dispatch) event [manually](https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow) for the `Create Release Pull Request` action to create the release PR.

   - For a backport release, the base branch should be the major version branch that you ensured existed in step 2. For a normal release, the base branch should be the main branch for that repository (which should be the default value).
   - This should trigger the [`action-create-release-pr`](https://github.com/MetaMask/action-create-release-pr) workflow to create the release PR.

4. Update the changelog to move each change entry into the appropriate change category ([See here](https://keepachangelog.com/en/1.0.0/#types) for the full list of change categories, and the correct ordering), and edit them to be more easily understood by users of the package.

   - Generally any changes that don't affect consumers of the package (e.g. lockfile changes or development environment changes) are omitted. Exceptions may be made for changes that might be of interest despite not having an effect upon the published package (e.g. major test improvements, security improvements, improved documentation, etc.).
   - Try to explain each change in terms that users of the package would understand (e.g. avoid referencing internal variables/concepts).
   - Consolidate related changes into one change entry if it makes it easier to explain.
   - Run `yarn auto-changelog validate --rc` to check that the changelog is correctly formatted.

5. Review and QA the release.

   - If changes are made to the base branch, the release branch will need to be updated with these changes and review/QA will need to restart again. As such, it's probably best to avoid merging other PRs into the base branch while review is underway.

6. Squash & Merge the release.

   - This should trigger the [`action-publish-release`](https://github.com/MetaMask/action-publish-release) workflow to tag the final release commit and publish the release on GitHub.

7. Publish the release on npm.

   - Be very careful to use a clean local environment to publish the release, and follow exactly the same steps used during CI.
   - Use `npm publish --dry-run` to examine the release contents to ensure the correct files are included. Compare to previous releases if necessary (e.g. using `https://unpkg.com/browse/[package name]@[package version]/`).
   - Once you are confident the release contents are correct, publish the release using `npm publish`.

## Attributions

This code was inspired by [eth-ledger-keyring](https://github.com/jamespic/eth-ledger-keyring), [eth-trezor-keyring](https://github.com/MetaMask/eth-trezor-keyring) and [eth-simple-keyring](https://github.com/MetaMask/eth-simple-keyring)
