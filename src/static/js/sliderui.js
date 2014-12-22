/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
require("./jquery.class");

/**
 * This is an implementation of a (very) simple Slider UI.
 *
 * Create a slider by doing:
 *    slider = new SliderUI(sliderbar_element, options);
 * sliderbar_element should be a jquery wraper of the element which will serve as
 *  the bar on which the handles will be hung.
 * optionalions is an optional dictionary which currently supports the following:
 *    value = the initial value for the default handle (default: 0)
 *    max   = the maximum value for the slider (default: 100)
 */


/**
 * A class for anything which can be hung off of the slider bar.
 * I.e. this is for the handle, or saved-revisions (stars).
 */
$.Class("SliderHandleUI",
  {//statics
  },
  {//instance
    /**
     * Construct the SliderHandle.
     * @param {SliderUI} slider The slider from which this handle will be hung.
     * @param {Number} position The initial position for this handle.
     */
    init: function (slider, value, type) {
      //console.log("New SliderHandle(%d, %s)", value, type);
      this.slider = slider;
      this.value = value;
      //create the element:
      this.element = $("<div class='ui-slider-handle'></div>");
      if (type === "")
        type = "handle";
      this.element.addClass("ui-slider-handle-" + type);
      this._mouseInit();
    },
    _mouseInit: function () {
      this.element.on("mousedown.sliderhandle", null, this, function(event) {
        //console.log("sliderhandleui - mousedown");
      });
    },
  }
);

//TODO:
//  - window resizing is currently broken!
//  - keyboard events
$.Class("SliderUI",
  {//statics
    defaults: {
      min: 0,
      max: 100,
      value: 0,
    }
  , animationDuration: 250
  },
  {//instance
    init: function (element, timerEl, options) {
      this.options = $.extend({}, this.defaults, options);
      this.timerEl = timerEl
      this.element = element;
      this.current_value = this.options.value;
      this.handles = [];
      this.createHandle(this.current_value, 'handle');
      this._mouseInit();

      // handle window resize
      var _this = this;
      $(window).resize(function() {
        _this.render();
      });
    },
    _getStep: function () {
      return (this.element.width()) / (this.options.max * 1.0);
    },
    render: function (duration) {
      var handle
        , left, handleWidth
      
      if(!duration) duration = SliderUI.animationDuration
      
      for(var h in this.handles) {
        handle = this.handles[h]
        left = (handle.value * this._getStep())
        handleWidth = handle.element.width()

        // animate slider handle
        handle.element.stop()
        handle.element.animate({left: left-(handleWidth/2) }, duration);
        
        if(h == 0) {
          // move the timer within the boundaries of the slider (centered above the handle if possible)
          var timerWidth = this.timerEl.width()
            , timerPos = Math.max(7, Math.min(left-(timerWidth/2)+(handleWidth/2), this.element.width()-timerWidth))
          this.timerEl.stop()
          this.timerEl.animate({left: timerPos }, duration);
        }
        
      }
    },
    
    /**
     * Starts moving the handle, even though the revision is not loaded, yet.
     * @param value - The revision to move the handle towards
     */
    indicateTransition: function(value) {
      this.handles[0].value = value
      this.render(2000)
    },
    /**
     * Update the value in the UI. This should never be called internally.
     * It should only be called by an event handler after a transition
     * has completed.
     * @param {number} value - The value to set.
     */
    setValue: function (value) {
      if (value < 0)
        value = 0;
      if (value > this.options.max)
        value = this.options.max;
      this.handles[0].value = value;
      this.current_value = value;
      this.render();
    },
    setMax: function (max) {
      this.options.max = max;
      this.render();
    },
    createHandle: function (value, type) {
      //console.log("createHandle(%d, %s)", value, type);
      var handle = new SliderHandleUI(this, value, type);
      this.handles.push(handle);
      this.element.append(handle.element);
      return handle;
    },
    _trigger: function (eventname, value) {
      //console.log("triggering event: ", eventname);
      if (eventname in this.options) {
        return this.options[eventname](value);
      }
    },
    _mouseInit: function () {
      // handle all mouse events for the slider and handles right here
      var _this = this;
      this.element.on("mousedown.slider", function (event) {
        if (event.target == _this.element[0] || $(event.target).hasClass("ui-slider-handle")) {
          // the click is on the slider bar itself.
          var start_value = Math.round((event.clientX-_this.element.offset().left) / _this._getStep());
          //console.log("sliderbar mousedown, value:", start_value);
          if (_this.current_value != start_value) {
            //_this.setValue(start_value);
          }
          var prev_value = start_value;

          $(document).on("mousemove.slider", function (event) {
             var current_value = Math.round((event.clientX-_this.element.offset().left) / _this._getStep());
             //console.log("sliderbar mousemove, value:", current_value);
             // don't change the value if it hasn't actually changed!
             if (prev_value != current_value) {
               _this._trigger("slide", current_value);
               prev_value = current_value;
             }
          });

          $(document).on("mouseup.slider", function (event) {
            // make sure to get rid of the handlers on document,
            // we don't need them after this 'slide' session is done.
            $(document).off("mouseup.slider mousemove.slider");
             var end_value = Math.round((event.clientX-_this.element.offset().left) / _this._getStep());
             //console.log("sliderbar mouseup, value:", end_value);
             // always change the value at mouseup
            _this._trigger("change", end_value);

          });
        } else {
          console.log("We shouldn't be here!");
          console.log(event.target);
        }
      });
    },
  }
);
