'use strict';
module.exports = function( grunt ) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json')

        ,jshint: {
          all: [
            'Gruntfile.js'
            ,'tasks/*.js'
          ],
          options: {
            jshintrc: '.jshintrc'
          },
        }

        // Unit tests.
        ,jasmine_node: {
            doktor: {
                src: ["tests/**/*spec.js"] // for coverage
                ,options: {
                    coverage: {} // using istanbul defaults
                    ,specFolders: ['tests']
                    ,captureExceptions: true
                    ,showColors: true
                    ,forceExit: true
                }
            }
        }

        ,doktor: {
            options: {
                homeFilePath: "README.md" // Home page. You'll get an error if this doesn't exist or is not set.
                ,pluginDir: ""
                ,ignoreDirNames: [ "_archive" ] // folder names to ignore
                ,unusedReadMeStr: "Add dependency notes here in Markdown format" // message for unset README's
                ,banner: '<%= pkg.name %> - <%= pkg.version %> - ' + grunt.template.today("yyyy-mm-dd, h:MM:ss TT")
            }

            ,test2: require("./tests/grunt_configs/test2.js").test
        }

        ,connect: {
            options: {
                hostname: 'localhost',
                keepalive: true,
                livereload: false,
                port: 8890,
                base: "",
            }

            ,test2: {
                options: {
                    open: "http://localhost:8890/dist/test2/index.html"
                }
            }
        }
    });

    grunt.registerTask("test1", ['jasmine_node:doktor'] );
    grunt.registerTask("test2", ['doktor:test2'] );

    grunt.registerTask("test", ['jshint', 'test2', 'test1'] ); // 'test1' must go last, as this actually runs the jasmine tests

    grunt.registerTask('default', ['test'].concat(  grunt.option("server") ? ["connect:"+grunt.option("server")] : [] )  );

    grunt.loadTasks('tasks');

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-jasmine-node-coverage');
}