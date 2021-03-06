var library = require("nrtv-library")(require)

library.define(
  "story-template",
  ["web-element", "make-it-editable"],
  function(element, makeItEditable) {

    var story = element.template(
      ".story",
      element.style({
        "max-width": "250px",
        "font-size": "1.4em",
        "clear": "right",
        "box-shadow": "-2px 0px 10px #d3d3e0",
        "padding": "10px",
        "color": "#662",
        "border-left": "6px solid #d00",
        "margin-top": "1em",
        "box-sizing": "border-box",
      }),
      function(stories, text, id, happenings) {

        var span = element("span", text)

        this.addChild(span)

        if (happenings) {
          var history = element("(happened "+(happenings.length == 1 ? "once)" : happenings.length+" times)"))
          this.addChild(history)
          this.classes.push("story-happened")
        }

        makeItEditable(
          this,
          stories.methodCall("get").withArgs(id),
          stories.methodCall("set").withArgs(id),
          {updateElement: span}
        )

      }
    )

    story.happened = element.style(
      ".story-happened",
      {"border-color": "lightgreen"}
    )

    return story
  }
)


library.using(
  ["nrtv-server", "browser-bridge", "web-element", "make-it-editable", "bridge-module", "add-html", "make-request", "function-call", "./tell-story", "story-template"],
  function(server, BrowserBridge, element, makeItEditable, bridgeModule, addHtml, makeRequest, functionCall, tellStory, storyTemplate) {

    server.start(9919)

    tellStory.addApiRoutes(server)
    
    server.addRoute("get", "/", function(request, response) {
      var bridge = new BrowserBridge()

      var fresh = bridge.defineSingleton(
        "freshStory",
        function() {
          var fresh = {text: "your story here"}

          return fresh
        }
      )

      var tellFresh = bridge.defineFunction(
        [
          fresh,
          makeRequest.defineOn(bridge),
          bridgeModule(library, "story-template", bridge),
          bridgeModule(library, "add-html", bridge),
          functionCall.defineOn(bridge),
        ],
        function(fresh, makeRequest, storyTemplate, addHtml, functionCall, storiesSource, event) {
          event.stopPropagation()

          makeRequest({
            method: "post",
            path: "/stories",
            data: {text: fresh.text}
          }, function(response) {
            var id = stories.tell(fresh.text)
            var baked = storyTemplate(functionCall(storiesSource), fresh.text, id)
            fresh.text = "your story here"
            document.querySelector(".save-button").style.display = "none"
            fresh.saveButton = false
            document.querySelector(".fresh-story span").innerText = "Tell a new story"
            addHtml.inside(".stories", baked.html())
          })

        }
      ).withArgs(tellStory.defineStoriesOn(bridge).callable())

      var getValue = bridge.defineFunction([fresh], function(fresh) {
          return fresh.text
        }
      )

      var setValue = bridge.defineFunction([fresh], function(fresh, text, makeRequest) {
        if (!fresh.saveButton) {
          document.querySelector(".save-button").style.display = "inline-block"
          fresh.saveButton = true
        }
        fresh.text = text
      })

      makeItEditable.prepareBridge(bridge, {useLibrary: true})

      var freshStory = element.template(
        ".fresh-story",
        storyTemplate,
        element.style({
          "border-left": "none"
        }),
        function(text) {
          var span = element(
            "span",
            element.style({
              "font-size": "0.8em"
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

      var bodyStyle = element.style(
        "body",
        {"background": "#fdfffc"}
      )

      var message = element.template.container(
        ".message",
        element.style({
          "margin": "1em 0",
          "font-family": "sans-serif"
        })
      )

      bridge.addToHead(element.stylesheet(storyTemplate, storyTemplate.happened,freshStory, bodyStyle, message).html())


      var newStoryButton = "Tell a new story"
      var template = freshStory(
        newStoryButton
      )

      var note = message("Stories should be in the present tense, and start with the doer, and then a verb: \"Bobby smiles\"")

      var container = element(".stories", note)

      tellStory.all(function(text, id, happenings) {

        var story = storyTemplate(tellStory.defineStoriesOn(bridge), text, id, happenings)

        container.addChild(story)
      })

      bridge.sendPage([template, container])(request, response)
    })

  }
)