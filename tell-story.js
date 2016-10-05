var library = require("nrtv-library")(require)

module.exports = library.export(
  "tell-story",
  ["make-request", "module-universe"],
  function(makeRequest, Universe) {
    var storiesById = {}
    var count = 0
    var aliases = {}
    var happenings = {}

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

    function all(callback) {
      for(var id in storiesById) {
        callback(storiesById[id], id, happenings[id])
      }
    }

    tellStory.itHappened = function(text, date) {
      var id = storyToId(text)
      if (aliases[id]) {
        id = aliases[id]
      }
      if (!happenings[id]) {
        happenings[id] = []
      }
      happenings[id].push(date)
    }


    function edit(id, text) {
      storiesById[id] = text
      aliases[storyToId(text)] = id
    }
            
    function defineOnBridge(bridge) {

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

    function addApiRoutes(server) {
      var universe = new Universe(
        "stories",
        library,
        ["./tell-story"],
        function(tellStory) {
          // begin
        }
      )

      if (process.env.AWS_ACCESS_KEY_ID) {
        universe.persistToS3({
          key: process.env.AWS_ACCESS_KEY_ID,
          secret: process.env.AWS_SECRET_ACCESS_KEY,
          bucket: "ezjs"
        })

        universe.loadFromS3(function(){
          console.log("OK! "+tellStory.count()+" stories told")
        })
      }

      server.addRoute("post", "/stories", function(request, response) {
        var text = request.body.text
        universe.do("tellStory", text)
        tellStory(text)

        var when = new Date().toString()
        universe.do("tellStory.itHappened", "Someone tells a story", when)
        tellStory.itHappened("Someone tells a story", when)

        response.send({success: true})
      })

      server.addRoute("post", "/stories/:id", function(request, response) {
        var text = request.body.text
        var id = request.params.id

        universe.do("tellStory.edit", id, text)
        tellStory.edit(id, text)
        response.send({success: true})
      })
    }

    tellStory.addApiRoutes = addApiRoutes
    tellStory.defineOn = defineOnBridge
    tellStory.edit = edit
    tellStory.all = all
    tellStory.allById = function() {
      return storiesById
    }
    tellStory.count = function() {
      return count
    }

    return tellStory
  }
)
