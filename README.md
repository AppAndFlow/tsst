# Typescript Shared Types (or tsst)

## Features

- **Allows you to centralize all of your types for one project liberating you from having to copy/paste them on each of your project's platform (web, backend, mobile etc)**
- **Leverage the power of git and github to centralize and to share with ease your typescript types**
- **Handy for js/ts fullstack projects**
- **Single place to maintain shared types**
- **Merge conflic safe**
- **Takes care of creating the repo holding all of your shared types for you if needed**

So I am not a huge fan of mono repo and I was looking for something that would
allow me to declare and to write all of my ts types at a single place so then I could
use them on different components of a given project ecosystem.

Let's say you have a web platform, a mobile platform and an API.
Those components might needs to share some types and copy/pasting your types
across those platforms might be time consuming and definitely not ideal for maintainability.

So this little package aims to offer a solution to that problem. It creates another
github repo where all your types under the folder "sharedTypes" will be commited to. It's not 100% perfect, but it might save you some times.

### Installation

```
  npm i @appandflow/tsst --save-dev
```

### Usage

**1 - package.json script shortcut**

You might wanna add this to your project's scripts in your package.json.
Also, this tool might play nice with a git pre-commit hook or a post-commit hook.

```
"scripts": {
  "tsst": "node node_modules/@appandflow/tsst/dist/tsst.js"
}
```

**2 - Initialization. You only need to do that at one place in your whole project ecosystem.**

This will guide you through the only few steps required to use this tool.

```
  npm run tsst init
```

**3 - Each time you start working on your project or each time you add a new type that you wish to share across your project ecosystem, run this**

Make sure to store all of the types you wish to share under the folder /sharedTypes/\*.
This folder will be generated when you run "npm run tsst init" or the first time you run
"npm run tsst update"

```
  npm run tsst update
```

You might have some merge conflicts sometimes. Nothing new here - you open your text editor
and you fix them manualy just like you normally do. Then you commit/push on your repo and you run
"npm run tsst update" again to update the now well merged types.

**4 - Profit ? That's it. Just run #3 when needed and store your shared types under /sharedTypes and you are all setup to share your types between your multiple project's components 👏**
