var EastVillageEverything = (function () {
  return {
    init: function () {
      this.fetchTags()
      this.fetchPlaces()

      $("#tag-list").on("change", this.filterPlaces)
    },

    getRemoteData: function (dataType, success) {
      var remoteHost = "http://54.84.219.81:8000/api/"
      $.get(remoteHost + dataType, success)
    },

    fetchTags: function () {
      this.getRemoteData("tags", function (data) {
        var $dropDown = $("#tag-list")

        $(data).each(function () {
          $dropDown.append($("<option>", {
            value: this.value,
            text:  this.display
          }))
        })
      })
    },

    formatPlace: function (place) {
      if (place.phone !== "") {
        place.displayPhone = "(" + place.phone.substr(0,3) + ") " + place.phone.substr(3,3) + "-" + place.phone.substr(6,4)
      }
      place.tags = !!place.tags ? place.tags.join(" ") : ""
      return place
    },

    fetchPlaces: function () {
      var $places   = $("#places")
      var source    = $("#place-template").html()
      var template  = Handlebars.compile(source)
      var parent    = this
      this.getRemoteData("places", function (data) {
        $(data).each(function () {
          $places.append(template(parent.formatPlace(this)))
        })
      })
    },

    filterPlaces: function () {
      $("#loading").css("visibility", "visible")
      $("#places").css("visibility", "hidden")

      setTimeout(function () {
        var filterValue = $("#tag-list").val()
        if (filterValue === "none") {
          $.each($("div.bar"), function () {
            $(this).show()
          })
        } else {
          $.each($("div.bar").filter("." + filterValue), function () {
            $(this).show()
          })

          $.each($("div.bar").not("." + filterValue), function () {
            $(this).hide()
          })
        }

        $("#loading").css("visibility", "hidden")
        $("#places").css("visibility", "visible")
      }, 500)
    }
  }
}())

$(document).ready(function () {
  EastVillageEverything.init()
})
