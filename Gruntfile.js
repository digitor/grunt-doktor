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

        ,clean: {
            tests: ["dist:test1"]
        }

        ,doktor: {
            options: {
                homeFilePath: "README.md"
                ,ignoreDirNames: [ "_archive" ]
                ,unusedReadMeStr: "Add dependency notes here in Markdown format"
                ,banner: '<%= pkg.name %> - <%= pkg.version %> - ' + grunt.template.today("yyyy-mm-dd, h:MM:ss TT")
            }

            ,test2: require("./tests/grunt_configs/test2.js").test
        }
    });

    grunt.registerTask("test1", ['jasmine_node:doktor'] );
    grunt.registerTask("test2", ['doktor:test2'] );

    grunt.registerTask("test", ['jshint', 'test2', 'test1'] ); // 'test1' must go last, as this actually runs the jasmine tests

    grunt.registerTask('default', ['test'].concat(  grunt.option("dirty") ? [] : ["clean:tests"] )  );

    grunt.loadTasks('tasks');

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-jasmine-node-coverage');
}