var library = require("nrtv-library")(require)

module.exports = library.export(
  "tell-story",
  function() {
    var stories = []
    function tellStory(text) {
      stories.push(text)
    }

    tellStory.all = function() {
      return stories
    }
    
    return tellStory
  }
)
