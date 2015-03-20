exports.test = {
	dest: "dist/test2/"
	// If src does not include '.md' files it will throw a warning, as this is the suggested approach
    ,src: [ 'resources/example-src/**/*.{md,html,js,scss,txt,ejs}' ]
    ,options: {
        host: "http://localhost:8880/dist/test2/"
    }
}