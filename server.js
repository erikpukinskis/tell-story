var library = require("nrtv-library")(require)

library.using(
  ["nrtv-server", "browser-bridge", "web-element", "make-it-editable", "bridge-module", "add-html", "make-request", "function-call"],
  function(server, BrowserBridge, element, makeItEditable, bridgeModule, addHtml, makeRequest, functionCall) {

    server.start(9919)

    console.log("BOOOM")

    server.addRoute("post", "/stories", function(request, response) {

      console.log("save story", request.body.text)
      response.send({success: false})
    })

    server.addRoute("get", "/", function(request, response) {
      var bridge = new BrowserBridge()

      var stories = bridge.defineSingleton("stories",
        [makeRequest.defineOn(bridge)],
        function(makeRequest) {
          var storiesById = {}
          var unnamedStory

          function saveStory(text, id) {
          }

          return {
            fresh: "your story here",
            save: saveStory
          }
      })

      var tellFresh = bridge.defineFunction(
        [stories, makeRequest.defineOn(bridge)],
        function(stories, makeRequest, event) {
          event.stopPropagation()
          makeRequest({
            method: "post",
            path: "/stories",
            data: {text: stories.fresh}
          }, function(response) {
            console.log(response)
          })

        }
      )

      var getValue = bridge.defineFunction([stories], function(stories) {
          return stories.fresh
        }
      )

      var setValue = bridge.defineFunction([stories], function(stories, text, makeRequest) {
        if (!stories.saveButton) {
          document.querySelector(".save-button").style.display = "inline-block"
          stories.saveButton = true
        }
        stories.fresh = text
      })

      bridgeModule(library, "make-it-editable", bridge)

      makeItEditable.prepareBridge(bridge, {useLibrary: true})

      var story = element.template(
        ".story",
        element.style({
          "display": "inline-block",
          "box-shadow": "1px 1px 10px #ccc",
          "padding": "10px",
          "color": "#662",
        }),
        function(text) {
          var span = element("span", text)
          this.addChild(span)

          makeItEditable(this, getValue, setValue, {updateElement: span})

          var save = element(
            "button.save-button",
            "Tell this story",
            element.style({
              "display": "none",
              "background": "#d00",
              "color": "white",
              "padding": "6px 12px",
              "font-size": "1em",
              "border": "0",
              "margin-left": "10px",
            })
          )

          save.onclick(
            tellFresh.withArgs(functionCall.raw("event")
            )
          )

          this.addChild(save)
        }
      )

      bridge.addToHead(element.stylesheet(story).html())


      var template = story(
        "tap me and tell a story"
      )

      bridge.sendPage(template)(request, response)
    })
  }
)