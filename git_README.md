# Overview of common git workflows

## References

- https://training.github.com/downloads/github-git-cheat-sheet/ better overview than below 
- https://ohshitgit.com/ for when things go wrong
- https://git-scm.com/docs official docs

## Glossary

| Syntax      | Description |
| ----------- | ----------- |
| Branch      | A version of the codebase with new commit(s), split off of the Main branch in the past, and to be merged back onto Main in the future. Used to contribute any change to the codebase. Aim for one change per branch.      |
| Main Branch   | The "true" version of the codebase, to be used for deployments. Should never be developed on directly, but rather split off of before developing a new feature, and merged back onto via Pull Request.        |
| Commit   | A single diff applied to the prior "parent" commit, referable by commit hash. Latest commit is refered to as HEAD.      |
| Diff | Literal list of changed/added/removed lines of code in files in the repo.  | 
| Pull Request | Preferred way of adding changes to the upstream codebase in github. |
| origin | Default name of the cloned Remote |
| upstream | Usual name for the project's main Remote |
| Remote | Version of the entire git project, either all devs work on the main Remote or every dev has their own "fork" to work on, from which they make Pull Requests to the main Remote. Your local directory of the project is connected to the online version you see on github via `git push` and `git pull`. You can also pull from other remotes via e.g. `git pull upstream`. You will **never** need to `git push upstream`. |  

## Load the project to your local machine

Fork the project to your account via the top right button on the project webpage.

From your fork, use the green code dropdown button to fetch the git url, e.g. https://github.com/CharlieKolb/mtgRater.git`, then

```
cd <targetParentDirectory>
# download your version of the codebase - this will likely require authentication with github
git clone https://github.com/<your account name>/mtgRater.git
cd mtgRater
# connect to the remote "true" version of the codebase
git remote add upstream https://github.com/CharlieKolb/mtgRater.git
```

This creates the project directory as a child of `<targetParentDirectory>`.

## Prepare to do work

Before making changes to the codebase, download changes from upstream and split a new branch off of main:

```
# download latest changes
git fetch upstream
# switch to the true version of the repo
git checkout upstream/main
# create a new version based on the current branch (which was changed to main just before this)
git branch your-branch-name
git checkout your-branch-name
```

Branches should contain a single, atomic change to the codebase, i.e. should be as small as possible while still justified as a meaningful change to the upstream repo.

Depending on the size of your task you may have either one or even multiple branches for your change. E.g. if you add a browser of all cards in the set, your first branch should only contain the new UI element and the most basic representation of the data.

You may receive feedback at that stage, which requires changes to your work that might render further efforts wasted.

## Integrate your changes to the true version of the codebase

Once your finish your feature, you first need to tell git which changes you want to "add".

View all changes via `git diff` or `git diff --stat`.

Add all changes in the repo via `git add .`, or add changes to existing files via `git add -u`, and then manually add new files and directories via `git add path/to/thing`.

Then you need to tell git you are ready to "commit" these changes onto your branch via `git commit -m "your descriptive message that others will see"`.

Now you're ready to publish your branch to your "online" fork of the repo via `git push -u origin your-branch-name`.

If you want to publish changes (i.e. additional commits) to an branch you already published, simply use `git push` after adding and committing your changes.

Now you can see the same branch and its changes online, and make a Pull Request. Navigate to the Pull Request tab in the **upstream** repo, create a new Pull Request, select your branch, add a short description, create and then ask for review via the UI.

## When things go wrong


Making mistakes is part of using git, when something unexpected happens, first of all don't panic - the second mistake tends to be the one you can't undo or fix.

See https://ohshitgit.com/ for common fixes or contact Charlie for help.
