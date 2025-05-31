module.exports = function (grunt) {
  grunt.initConfig({
    env: {
      env_file: ".env",
      injection_file: "./build/index.js",
    },
  });

  grunt.loadNpmTasks("grunt-p4b");
};
