# Landkid

[![CircleCI](https://circleci.com/gh/atlassian/landkid/tree/master.svg?style=svg)](https://circleci.com/gh/atlassian/landkid/tree/master)

> Your friendly neighborhood async merging robot G.O.A.T.

Anyone who has worked in a large repo with many other developers, especially in
a CI/CD environment will know the pains of merging. What might be green in a
branch might suddenly break master and everyone else who is rebased from it!
Nobody wants to be the person to blame for that and nobody wants to be tracking
down which strange combinations of changes suddenly broke things.

That's why we've made Landkid! A self-hosted service that can manage your merges
so that your master builds stay green and your devs stay happy!

### So how does it work?

It really is quite simple. The key to keeping master green is simple:

* Make sure all branch builds are run whilst rebased against latest master
  before merging
* Make sure only one build can be being merged at a time

That's it!

Landkid simply provides a simple queue and a way to call a custom build that
runs with master. Instead of hitting "merge", you'll get landkid to add you to a
queue which runs one sanity check build (the equivalent of the same build that
would have run, had your merge happend) and if it goes green, is merged
automatically!

#### Supported Hosts

* [x] Bitbucket
* [ ] GitHub (Help Wanted!)

#### Supported CI Services

* [x] Bitbucket Pipelines
* [ ] TravisCI (Help Wanted!)
* [ ] CircleCI (Help Wanted!)

### Setting up your own Landkid server (Bitbucket)

WIP

### Why can master break when branch builds are green?

### Branches being behind master

By far, the number one root cause is a branch not being up to date with latest
master when it is merged. This could mean it is depending on code that is no
longer there, it reintroduces patterns that have been refactored, it adds code
that fails linting rules that were changed, etc. There are tons of ways this can
break, but all from the same root cause.

> Can't we just always rebase branch builds on master then?

Short answer: no.

Longer answer:

The problem is threefold:

1. What is to stop someone from running a branch build but not merging it for 24
   hours?

   In that time, more commits will be in master and your build will still be
   green!

2. What happens if master does actually break now? Not only is master + all of
   the latest branches broken, but every single branch build! Until it is fixed
   in master!

3. This also makes it so that the code that runs in your branch builds doesn't
   match the code that runs in your local machine. If a test passes locally but
   not in CI, it adds an extra layer of unknowns of what might have gone wrong.

> Okay, so what if we just added a check that makes sure you can only merge when
> you are already rebased on master?

Sure, that would solve the problem.

Except now you are moving all the responsibilty to keep things up to date on the
devs.

It would create an endless cycle of approvals, rebases, merge conflicts,
approvals, rebases, etc.

### Simultaneous Releases

CI/CD builds suffer from even more complexity with merges. Consider a monorepo's
build that looks something like this:

```yml
- ./someSetupScript.sh
# find which packages have changes (probably using git)
- export CHANGED_PACKAGES=`./calculateChangedPackages.sh`
- yarn run build
- yarn run lint
- yarn run test
- ./bumpPackagesVersionsAndPushToMaster.sh
- yarn run release
```

Imagine we have two branches both trying to perform a minor release of
package-A. If both are merged close together then both are going to try to
release the same version of package-A with different changes!

> So, can't we just have a check at the beginning of a master build that
> automatically stops if there is one currently running?

Sure, you could. but take a look below at the next problem.

### Changes in master whilst a current build is already happening

Closely related to `Simultaneous Releases`, but not entirely restricted to
CI/CD. Consider the build above, the `bumpPackagesVersionsAndPushToMaster.sh`
script might look something like this:

```sh
# bumpPackagesVersionsAndPushToMaster.sh
./bumpPackageVersions.sh --changed="$CHANGED_PACKAGES"
./updateChangelogs.sh --changed="$CHANGED_PACKAGES"
git add packages/*/package.json
git add packages/*/CHANGELOG.md
git commit -m "Releasing; $CHANGED_PACKAGES"
git push origin master
```

Immediately, there is an obvious problem on the last line. What if someone has
pushed to master whilst our build was still running? That push will fail because
we cant make a fast-forward push!

> Surely we can just rebase on latest master before pushing then, right?

Unfortunately no!

Take another look at the last line of our monorepos master build

```
- yarn run release
```

That's about to pacakge our code up and push to npm. What about all the new
changes we've just pulled into our build when we rebased? Did we test them? Lint
them? **BUILD** them?

You can keep going deeper, trying to add rebases, and checkout outs, or staging
branches, but you will innevitably wind up with the same solution, or another
hidden caveat somewhere.
