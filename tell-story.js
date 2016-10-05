var library = require("nrtv-library")(require)

module.exports = library.export(
  "tell-story",
  ["make-request"],
  function(makeRequest) {
    var storiesById = {}
    var count = 0

    function tellStory(text) {
      var id = storyToId(text)
      if (storiesById[id]) {
        throw new Error("There's already a story with id "+id)
      }
      storiesById[id] = text
      count++

      return id
    }

    function storyToId(text) {
      return text.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    }

    tellStory.all = function(callback) {
      for(var id in storiesById) {
        callback(storiesById[id], id)
      }
    }

    tellStory.count = function() {
      return count
    }

    tellStory.allById = function() {
      return storiesById
    }

    tellStory.edit = function(id, text) {
      storiesById[id] = text
    }
    
    tellStory.defineOn = function(bridge) {

      var tellInBrowser = bridge.defineSingleton("tellStory",
        [makeRequest.defineOn(bridge)],
        function(makeRequest) {
          var storiesById = {}
          var dirty = {}
          var sending = {}

          function load(byId) {
            storiesById = byId
          }

          function get(id) {
            return storiesById[id]
          }

          function set(id, text) {
            storiesById[id] = text
            if (sending[id]) {
              dirty[id] = true
            } else {
              sending[id] = true
              setTimeout(save.bind(null, id), 3000)
            }
          }

          function save(id) {
            if (dirty[id]) {
              dirty[id] = false
              setTimeout(save.bind(null, id), 3000)
              return
            }

            makeRequest({
              method: "post",
              path: "/stories/"+id,
              data: {
                text: storiesById[id]
              }
            }, finish.bind(null, id))
          }

          function finish(id, response) {
            sending[id] = false
          }

          function storyToId(text) {
            return text.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          }

          function tellStory(text) {
            var id = storyToId(text)
            storiesById[id] = text
            return id
          }

          tellStory.load = load
          tellStory.get = get
          tellStory.set = set

          return tellStory
        }
      )

      bridge.asap(
        tellInBrowser.methodCall("load").withArgs(tellStory.allById())
      )

      return tellInBrowser
    }

    function storyToId(text) {
      return text.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    }

    return tellStory
  }
)
