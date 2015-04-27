# grunt-doktor

> Documentation generator grunt plugin, featuring tags and support for any text file. Also useful as a simple peer code review tool, by utilizing in-code tagging. Still in beta.

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-doktor --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-doktor');
```

*This plugin was designed to work with Grunt 0.4.5. It will not work with v0.3.x.*

## Example config
```js
{
	// If src does not include '.md' files it will throw a warning, as this is the suggested approach
    src: [ 'path/to/project/and/file/types/**/*.{md,html,js,scss,txt,hbs}' ]
	,dest: "path/to/static/html/documentation/"
    ,options: {
    	// this will get launched on completion of each build
        host: "http://localhost:8880/then/path/to/static/html/documentation/"
    }
}
```


## Release Notes:
- 0.1.3 - Added some more info to the README.md along with an example.
- 0.1.2 - Cleaned out snippets after build.
- 0.1.1 - Started writing tests and cleaning code up a bit.
- 0.1.0 - Port from personal project grunt-tagdoc. Will likely have some problems.