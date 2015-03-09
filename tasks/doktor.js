module.exports = function(grunt) {
	"use strict";

	var NS = "doktor"
		,ejs = require("ejs")
		,marked = require("marked")
		,_ = require( 'lodash-node' );

	marked.setOptions({
		renderer: new marked.Renderer(),
		gfm: true,
		tables: true,
		breaks: false,
		pedantic: false,
		sanitize: false,
		smartLists: true,
		smartypants: false
	});

	grunt.registerMultiTask( NS
		,"Documentation generator for any text file, based on comments and tags"
		,function() {

		var config = this.options({
			// .md is mandatory
			fileTypes: ["html","css","js","ejs","scss"]
			,openComment: "/***"
			,closeComment: "***/"
			,endCode: "/*@end*/"
			,pluginDir: "custom_modules/"+NS+"/"
			,host: ""
			,ignoreDirNames: [ "_archive", "img" ]
			,homeTitle: "root"
			,homeFilePath: null
			,unusedReadMeStr: "TODO"
			,cleanDest: false
			,banner: null
		});

		// add slash is one doesn't exist
		if( typeof config.host === "string" ) {
			if( config.host === "" || config.host.substr( config.host.length-1 ) !== "/" )
				config.host += "/";
		}


		var done = this.async();
		grunt.log.writeln( NS.yellow );

		var fileObj = this.files[0];

		var SNIPPETS_PATH = fileObj.dest + "/snippets/";

		if( fileObj.src.length === 0 ) {
			grunt.log.error( "'"+NS+"' needs at least 1 src directory!".red );
			done();
			return;
		}

		// cleans out the old first
		if( config.cleanDest && grunt.file.exists(fileObj.dest) ) grunt.file.delete( fileObj.dest, {force:true} );

		var bootstrapFiles = grunt.file.expand({ cwd: config.pluginDir + "resources" }, "bootstrap-3.3.1/*");
		
		_.forEach( bootstrapFiles, function(relPath) {
			grunt.file.copy( config.pluginDir + "resources/" + relPath, fileObj.dest + "/"+relPath );
		});

		var commentsData = parseSrc( config, fileObj )
			,navMarkup = getNavMarkup( fileObj.dest, config, commentsData );

		grunt.file.write( SNIPPETS_PATH + "/nav-pages.html", navMarkup.pages );
		grunt.file.write( SNIPPETS_PATH + "/nav-tags.html", navMarkup.tags );

		writeSnippets( SNIPPETS_PATH, commentsData, config );
		writeTemplate( fileObj.dest, config, SNIPPETS_PATH, commentsData );

		done();
	});


	function stripPreceedingDirChange( path ) {
		var newPath = ""
			,subDirStarted = false;
		_.forEach( path.split("../"), function( str ) {

			// ignore any paths at the start of path if they contain "../"
			if( str.length !== 0 ) subDirStarted = true;

			if( subDirStarted ) {
				newPath += str;
				// if( str.length === 0 )
			}
		});

		return newPath;
	}


	function writeTemplate( dest, config, snippetsPath, commentsData ) {

		var templatePath = config.pluginDir + "resources/template.ejs"
		if( grunt.file.exists( templatePath ) ) {


			var navPagesMarkup = grunt.file.read( snippetsPath + "/nav-pages.html" )
				,navTagsMarkup = grunt.file.read( snippetsPath + "/nav-tags.html" )
				,homeDone = false;

			_.forEach( commentsData.readmeNav, function( navObj, name ) {

				// name = stripPreceedingDirChange( name );

				var path = dest + "/index.html";
				if( homeDone ) path = dest + "/" + name + ".html";
				homeDone = true;

				// sets the class to active for the current page
				var markup = navPagesMarkup.split("data-name='"+name+"'").join("class='active' data-name='"+name+"'");

				var rendered = ejs.render( grunt.file.read(templatePath), {
					config: {
						_:_
						,heading: null //name
						,nav: {
							pages: markup
							,tags: navTagsMarkup
							,breadcrumbs: (function(arr) {
								var markup = "";
								_.forEach(arr, function(crumb) {
									markup += "\n<li><a>"+crumb+"</a></li>";
								});
								return markup;
							})( name.split("/") )
						}
						,body: getTaggedMarkup( navObj, config.host, false, "<strong>View in-code docs by tag:</strong>" )
						,host: config.host
						,homeTitle: config.homeTitle
						,banner: config.banner || "-"
					}
				});

				// console.log( path );
				grunt.file.write( path, rendered );
			});


			_.forEach( getAllTags(commentsData), function( tag ) {

				var body = "";
				_.forEach( commentsData.codeComments, function( codeCmt ) {
					if( codeCmt.tags.indexOf(tag) !== -1 ) {
						body += "\n" + getCodeCmtMarkup(codeCmt, config.host) + "\n";
					}
				});

				var rendered = ejs.render( grunt.file.read(templatePath), {
					config: {
						_:_
						,heading: "Tag: " + tag
						,nav: {
							pages: navPagesMarkup
							,tags: navTagsMarkup
							,breadcrumbs: []
						}
						,body: body
						,host: config.host
						,homeTitle: config.homeTitle
						,banner: config.banner || "-"
					}
				});

				grunt.file.write( dest + "/tags/" + tag + ".html", rendered );
			});
		}
	}
	

	function getCodeCmtMarkup( codeCmt, host ) {
		var markdown = "";

		markdown += "###Source ("+codeCmt.ext+")\n";
		markdown += "`" + codeCmt.src + "`\n";

		markdown += "###Comments\n";
		markdown += codeCmt.docs + "\n";

		if( codeCmt.codeBlock ) {
			markdown += "###Code\n";
			markdown += "```\n" + codeCmt.codeBlock + "\n```\n";
		}

		markdown += "###Tags\n";
		markdown += convertTagToLink( codeCmt.tags, host, true ) + "\n";

		return "<section class='doktor-section'>" + marked( markdown ) + "</section>";
	}


	function writeSnippets( dest, commentsData, config ) {

		// This isn't really being used yet, but may come in handy

		_.forEach( commentsData.readmeNav, function( navObj, name ) {
			grunt.file.write( dest + "/" + name + ".html", getTaggedMarkup( navObj, config.host ) );
		});
		
		_.forEach( commentsData.codeComments, function( codeCmt ) {
			var markup = getCodeCmtMarkup( codeCmt, config.host );
			grunt.file.write( dest + "/code/" + codeCmt.ext + "/" + Math.random().toString().replace(".","") + ".html", markup );
		});
	}


	// Object must have 'markup' {string} and 'tags' {array of strings} properties
	function getTaggedMarkup( obj, host, useMarkDown, customTitle ) {

		var rx = new RegExp("@tags[\\d\\D]*?\\]", "g");

		var newMarkup = (customTitle || "@tags ") + convertTagToLink( obj.tags, host, useMarkDown );

		return obj.markup.replace(rx, newMarkup);
	}


	function convertTagToLink( tag, host, useMarkDown ) {
		var markdown = "";
		
		if( _.isArray(tag) ) {
			_.forEach(tag, function(t,i) {
				if(i>0) markdown += " , ";
				markdown += "["+t+"]("+host+"tags/"+t+".html)";
			});

			if( useMarkDown ) return markdown;
			return marked( markdown );
		}

		markdown += "["+tag+"]("+host+"tags/"+tag+".html)";

		if( useMarkDown ) return markdown;
		return marked( markdown );
		// return "<a href='"+host+"tags/"+tag+".html'>" + tag + "</a>";
	}


	function getNavMarkup( dest, config, commentsData ) {

		var homeDone = false
			,pages = ""
			,tags = "";

		_.forEach( commentsData.readmeNav, function( navObj, name ) {
			var path = config.host + "index.html"
				,linkName = config.homeTitle;

			if( homeDone ) {
				path = config.host + name + ".html";

				var linkNameArr = name.split("/");
				linkName = "";
				_.forEach( linkNameArr, function(nm,i) {
					if( i === linkNameArr.length-1 )
						linkName += nm;
					else
						// linkName += "&nbsp;&nbsp;";
						linkName += "> ";
				});
			}

			pages += "\n<li data-state='"+( navObj.unused ? "unused" : "used" )+"' data-name='"+name+"' ><a href='"+path+"'>" + linkName + "</a></li>";

			homeDone = true;
		});

		_.forEach( getAllTags(commentsData), function( tag ) {
			tags += "\n<li><a href='"+config.host+"tags/"+tag+".html'>" + tag + "</a></li>";
		});

		return {
			pages: pages
			,tags: tags
		}
	}




	function getAllTags( commentsData ) {

		var tags = [];

		// get readme tags
		_.forEach( commentsData.readmeNav, function( navObj, name ) {
			_.forEach( navObj.tags, function( tag ) {
				tags.push( tag );
			});
		});

		// get code comment tags
		_.forEach( commentsData.codeComments, function( codeCmt ) {
			_.forEach( codeCmt.tags, function( tag ) {
				tags.push( tag );
			});
		});

		// remove duplicates
		return _.unique( tags );
	}


	function parseSrc( config, fileObj ) {

		var codeComments = []
			,readmeNav = {};

		if( config.homeFilePath ) {
			var src = config.homeFilePath;
			if( !grunt.file.exists( src ) ) {
				grunt.log.error("File doesn't exist: ".red + src);
				return false;
			}

			var dirSlashInd = src.lastIndexOf("/")
				,navObj = readmeNav[ "root" ] = {};
			
			marked( grunt.file.read(src), function(err, content) {
				if(err) grunt.log.error( err );

				navObj.markup = content;
				navObj.tags = getTags( content );
			});

		}

		_.forEach( fileObj.src, function( src ) {


			var extDotInd = src.lastIndexOf(".")
				,ext = src.slice( extDotInd+1 );

			if( !grunt.file.exists( src ) ) {
				grunt.log.error("File doesn't exist: ".red + src);
				return false;
			}

			// filter out matching directories to ignore
			var ignoreSrc = _.filter( config.ignoreDirNames, function( dirName ) {
				return _.contains( src.split("/"), dirName );
			});

			if( ignoreSrc.length > 0 ) {
				grunt.log.warn("Skipping ignored directory: ".yellow + src);
				return;
			}

			if( ext === "md" ) {

				var dirSlashInd = src.lastIndexOf("/")
					,dir = stripPreceedingDirChange( src.slice( 0, dirSlashInd ) )
					,navObj = readmeNav[ dir ] = {}
					,markdown = grunt.file.read(src);
				
				marked( markdown, function(err, content) {
					if(err) grunt.log.error( err );

					navObj.markup = content;
					navObj.tags = getTags( content );
					navObj.unused = (content.indexOf(config.unusedReadMeStr) !== -1);
				});


				codeComments.push({
					ext: ext
					,tags: navObj.tags
					,docs: getTaggedMarkup( {
							markup: markdown.replace("#","####").split("\n#").join("\n####")
							,tags: navObj.tags
						}, config.host, true )
					,codeBlock: null
					,src: src
				});

			} else if( config.fileTypes.indexOf(ext) !== -1 ) {

				var code = grunt.file.read(src)
					,commentArr = code.split( config.openComment );
				
				_.forEach( commentArr, function(cmt, i) {
					
					if(i>0) {

						
						var tags = getTags( cmt )
							,cmtBlockArr = cmt.split( config.closeComment )


						if( cmtBlockArr.length <= 1 ) {
							grunt.log.warn("Comment not closed properly. Must be closed with ".red + config.closeComment + " - src: " + src );
							return;
						}

						if( cmtBlockArr[1].indexOf( config.endCode ) === -1 ) {
							grunt.log.warn("Comment ".red + config.endCode + " not found. Must come after the related code block ".red + " - src: " + src  );

							// check for common typos
							if( cmtBlockArr[1].indexOf( "/*end*/" ) !== -1 )
								grunt.log.warn("`/*end*/` found. Did you accidently forget the `@` symbol  when writing `/*@end*/` ?"  );
							return;
						}
						
						var docs = getDocs( cmtBlockArr[0], config.closeComment )
							,codeBlock = sanitizeCodeBlock( cmtBlockArr[1].split( config.endCode )[0] )

						codeComments.push({
							ext: ext
							,tags: tags
							,docs: docs
							,codeBlock: codeBlock
							,src: src
						});
					}
				});
				
			}

				// console.log( src );
			// console.log( codeComments );
		});

		return {
			codeComments: codeComments
			,readmeNav: readmeNav
		}
	}
	

	function getTags( str ) {
		var arr = str.split("@tags");
		if( arr.length === 1 ) return [];
		return sanitizeTags( arr[1].split("]")[0] + "]" );
	}

	function getDocs( str, closeComment ) {
		var arr = str.split("@docs");
		if( arr.length === 1 ) return "";
		return sanitizeDocs( str.split("@docs")[1].split( closeComment )[0] );
	}

	function sanitizeTags( str ) {
		return str.split("[").join("")
					.split("]").join("")
					.split('"').join('')
					.split('&quot;').join('')
					.split("'").join('')
					.split('&#39;').join('')
					.split(' ').join('')
					.split(",");
	}

	function sanitizeDocs( str ) {
		return str.split(" * ").join("<br>")
					.split("\t").join("")
					.split("  ").join(" ")
					.split("\n").join(" ")
					.split("\r").join(" ");
	}


	function sanitizeCodeBlock( str ) {
		// needs work
		// return "<pre><code class='lang-css'>" + str.split("\t\t").join("\t") + "</code></pre>";
		// return "<pre><code class='lang-css'>" + str + "</code></pre>";
		return str;
	}

	return {
		tests: {

		}
	}
};