var library = require("nrtv-library")(require)

library.define(
  "story-template",
  ["web-element"],
  function(element) {
    var story = element.template(
      ".story",
      element.style({
        "max-width": "250px",
        "clear": "right",
        "box-shadow": "-2px 0px 10px #ddd",
        "padding": "10px",
        "color": "#662",
        "border-left": "6px solid #d00",
        "margin-top": "1em",
        "box-sizing": "border-box",
      }),
      function(text) {
        this.addChild(text)
      }
    )

    return story
  }
)

library.using(
  ["nrtv-server", "browser-bridge", "web-element", "make-it-editable", "bridge-module", "add-html", "make-request", "function-call", "module-universe", "./tell-story", "story-template"],
  function(server, BrowserBridge, element, makeItEditable, bridgeModule, addHtml, makeRequest, functionCall, Universe, tellStory, story) {

    server.start(9919)

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
        console.log("OK! "+tellStory.all().length+" stories told")
      })
    }

    server.addRoute("post", "/stories", function(request, response) {
      var text = request.body.text
      universe.do("tellStory", text)
      tellStory(text)
      response.send({success: true})
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
        [
          stories,
          makeRequest.defineOn(bridge),
          bridgeModule(library, "story-template", bridge),
          bridgeModule(library, "add-html", bridge),
        ],
        function(stories, makeRequest, story, addHtml, event) {
          event.stopPropagation()

          var text = stories.fresh

          makeRequest({
            method: "post",
            path: "/stories",
            data: {text: text}
          }, function(response) {
            var baked = story(text)
            stories.fresh = "your story here"
            document.querySelector(".save-button").style.display = "none"
            stories.saveButton = false
            document.querySelector(".fresh-story span").innerText = "tap me and tell a story"
            addHtml.inside(".stories", baked.html())
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

      var freshStory = element.template(
        ".fresh-story",
        story,
        element.style({
          "border-left": "none"
        }),
        function(text) {
          var span = element(
            "span",
            element.style({
              "font-size": "1.2em"
            }),
            text
          )

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

      bridge.addToHead(element.stylesheet(story, freshStory).html())


      var template = freshStory(
        "tap me and tell a story"
      )


      var container = element(".stories", tellStory.all().map(story))

      bridge.sendPage([template, container])(request, response)
    })
  }
)