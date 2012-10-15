# Developer Guidelines

Please talk to people on the mailing list before you change this page

Mailing list: https://groups.google.com/forum/?fromgroups#!forum/etherpad-lite-dev

IRC channels: [#etherpad](irc://freenode/#etherpad) ([webchat](webchat.freenode.net?channels=etherpad)), [#etherpad-lite-dev](irc://freenode/#etherpad-lite-dev) ([webchat](webchat.freenode.net?channels=etherpad-lite-dev))

**Our goal is to iterate in small steps. Release often, release early. Evolution instead of a revolution**

## General goals of Etherpad Lite
* easy to install for admins
* easy to use for people
* using less resources on server side
* easy to embed for admins
* also runable as etherpad lite only 
* keep it maintainable, we don't wanna end ob as the monster Etherpad was
* extensible, as much functionality should be extendable with plugins so changes don't have to be done in core

## How to code:
* **Please write comments**. I don't mean you have to comment every line and every loop. I just mean, if you do anything thats a bit complex or a bit weird, please leave a comment. It's easy to do that if you do while you're writing the code. Keep in mind that you will probably leave the project at some point and that other people will read your code. Undocumented huge amounts of code are worthless
* Never ever use tabs
* Indentation: JS/CSS: 2 spaces; HTML: 4 spaces
* Don't overengineer. Don't try to solve any possible problem in one step. Try to solve problems as easy as possible and improve the solution over time
* Do generalize sooner or later - if an old solution hacked together according to the above point, poses more problems than it solves today, reengineer it, with the lessons learned taken into account.
* Keep it compatible to API-Clients/older DBs/configurations. Don't make incompatible changes the protocol/database format without good reasons

## How to work with git
* Make a new branch for every feature you're working on. Don't work in your master branch. This ensures that you can work you can do lot of small pull requests instead of one big one with complete different features
* Don't use the online edit function of github. This only creates ugly and not working commits
* Test before you push. Sounds easy, it isn't
* Try to make clean commits that are easy readable
* Don't check in stuff that gets generated during build or runtime (like jquery, minified files, dbs etc...)
* Make pull requests from your feature branch to our develop branch once your feature is ready
* Make small pull requests that are easy to review but make sure they do add value by themselves / individually

## Branching model in Etherpad Lite
see git flow http://nvie.com/posts/a-successful-git-branching-model/

* master, the stable. This is the branch everyone should use for production stuff
* develop, everything that is READY to go into master at some point in time. This stuff is tested and ready to go out
* release branches, stuff that should go into master very soon, only bugfixes go into these (see http://nvie.com/posts/a-successful-git-branching-model/ for why)
* you can set tags in the master branch, there is no real need for release branches imho
* The latest tag is not what is shown in github by default. Doing a clone of master should give you latest stable, not what is gonna be latest stable in a week, also, we should not be blocking new features to develop, just because we feel that we should be releasing it to master soon. This is the situation that release branches solve/handle.
* hotfix branches, fixes for bugs in master
* feature branches (in your own repos), these are the branches where you develop your features in. If its ready to go out, it will be merged into develop

Over the time we pull features from feature branches into the develop branch. Every month we pull from develop into master. Bugs in master get fixed in hotfix branches. These branches will get merged into master AND develop. There should never be commits in master that aren't in develop

## Documentation
The docs are in the `doc/` folder in the git repository, so people can easily find the suitable docs for the current git revision.

Documentation should be kept up-to-date. This means, whenever you add a new API method, add a new hook or change the database model, pack the relevant changes to the docs in the same pull request.

You can build the docs e.g. produce html, using `make docs`. At some point in the future we will provide an online documentation. The current documentation in the github wiki should always reflect the state of `master` (!), since there are no docs in master, yet.