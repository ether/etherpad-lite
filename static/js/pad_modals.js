/**
 * Copyright 2009 Google Inc.
 * 
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

var padmodals = (function() {

  /*var clearFeedbackEmail = function() {};
  function clearFeedback() {
    clearFeedbackEmail();
    $("#feedbackbox-message").val('');
  }

  var sendingFeedback = false;
  function setSendingFeedback(v) {
    v = !! v;
    if (sendingFeedback != v) {
      sendingFeedback = v;
      if (v) {
        $("#feedbackbox-send").css('opacity', 0.75);
      }
      else {
        $("#feedbackbox-send").css('opacity', 1);
      }
    }
  }*/

  var sendingInvite = false;
  function setSendingInvite(v) {
    v = !! v;
    if (sendingInvite != v) {
      sendingInvite = v;
      if (v) {
        $(".sharebox-send").css('opacity', 0.75);
      }
      else {
        $("#sharebox-send").css('opacity', 1);
      }
    }
  }

  var clearShareBoxTo = function() {};
  function clearShareBox() {
    clearShareBoxTo();
  }

  var self = {
    init: function() {
      self.initFeedback();
      self.initShareBox();
    },
    initFeedback: function() {
      /*var emailField = $("#feedbackbox-email");
      clearFeedbackEmail =
        padutils.makeFieldLabeledWhenEmpty(emailField, '(your email address)').clear;
      clearFeedback();*/

      $("#feedbackbox-hide").click(function() {
        self.hideModal();
      });
      /*$("#feedbackbox-send").click(function() {
        self.sendFeedbackEmail();
      });*/

      $("#feedbackbutton").click(function() {
        self.showFeedback();
      });

      $("#uservoicelinks a").click(function() {
        self.hideModal();
        return true;
      });
      $("#feedbackemails a").each(function() {
        var node = $(this);
        node.attr('href', "mailto:"+node.attr('href')+"@etherpad.com");
      });
    },
    initShareBox: function() {
      $("#sharebutton, #nootherusers a").click(function() {
        self.showShareBox();
      });
      $("#sharebox-hide").click(function() {
        self.hideModal();
      });
      $("#sharebox-send").click(function() {
        self.sendInvite();
      });

      $("#sharebox-url").click(function() {
        $("#sharebox-url").focus().select();
      });

      clearShareBoxTo =
        padutils.makeFieldLabeledWhenEmpty($("#sharebox-to"),
                                           "(email addresses)").clear;
      clearShareBox();

      $("#sharebox-subject").val(self.getDefaultShareBoxSubjectForName(pad.getUserName()));
      $("#sharebox-message").val(self.getDefaultShareBoxMessageForName(pad.getUserName()));

      $("#sharebox-stripe .setsecurity").click(function() {
        self.hideModal();
        paddocbar.setShownPanel('security');
      });
    },
    getDefaultShareBoxMessageForName: function(name) {
      return (name || "Somebody")+" has shared an EtherPad document with you."+
        "\n\n"+"View it here:\n\n"+
        padutils.escapeHtml($(".sharebox-url").val()+"\n");
    },
    getDefaultShareBoxSubjectForName: function(name) {
      return (name || "Somebody")+" invited you to an EtherPad document";
    },
    relayoutWithBottom: function(px) {
      $("#modaloverlay").height(px);
      $("#sharebox").css('left',
                         Math.floor(($(window).width() -
                                     $("#sharebox").outerWidth())/2));
      $("#feedbackbox").css('left',
                            Math.floor(($(window).width() -
                                        $("#feedbackbox").outerWidth())/2));
    },
    showFeedback: function() {
      self.showModal("#feedbackbox");
    },
    showShareBox: function() {
      // when showing the dialog, if it still says "Somebody" invited you
      // then we fill in the updated username if there is one;
      // otherwise, we don't touch it, perhaps the user is happy with it
      var msgbox = $("#sharebox-message");
      if (msgbox.val() == self.getDefaultShareBoxMessageForName(null)) {
        msgbox.val(self.getDefaultShareBoxMessageForName(pad.getUserName()));
      }
      var subjBox = $("#sharebox-subject");
      if (subjBox.val() == self.getDefaultShareBoxSubjectForName(null)) {
        subjBox.val(self.getDefaultShareBoxSubjectForName(pad.getUserName()));
      }

      if (pad.isPadPublic()) {
        $("#sharebox-stripe").get(0).className = 'sharebox-stripe-public';
      }
      else {
        $("#sharebox-stripe").get(0).className = 'sharebox-stripe-private';
      }

      self.showModal("#sharebox", 500);
      $("#sharebox-url").focus().select();
    },
    showModal: function(modalId, duration) {
      $(".modaldialog").hide();
      $(modalId).show().css({'opacity': 0}).animate({'opacity': 1}, duration);
      $("#modaloverlay").show().css({'opacity': 0}).animate({'opacity': 1}, duration);
    },
    hideModal: function(duration) {
      padutils.cancelActions('hide-feedbackbox');
      padutils.cancelActions('hide-sharebox');
      $("#sharebox-response").hide();
      $(".modaldialog").animate({'opacity': 0}, duration, function () { $("#modaloverlay").hide(); });
      $("#modaloverlay").animate({'opacity': 0}, duration, function () { $("#modaloverlay").hide(); });
    },
    hideFeedbackLaterIfNoOtherInteraction: function() {
      return padutils.getCancellableAction('hide-feedbackbox',
                                           function() {
                                             self.hideModal();
                                           });
    },
    hideShareboxLaterIfNoOtherInteraction: function() {
      return padutils.getCancellableAction('hide-sharebox',
                                           function() {
                                             self.hideModal();
                                           });
    },
/*    sendFeedbackEmail: function() {
      if (sendingFeedback) {
        return;
      }
      var message = $("#feedbackbox-message").val();
      if (! message) {
        return;
      }
      var email = ($("#feedbackbox-email").hasClass('editempty') ? '' :
                   $("#feedbackbox-email").val());
      var padId = pad.getPadId();
      var username = pad.getUserName();
      setSendingFeedback(true);
      $("#feedbackbox-response").html("Sending...").get(0).className = '';
      $("#feedbackbox-response").show();
      $.ajax({
        type: 'post',
        url: '/ep/pad/feedback',
        data: {
          feedback: message,
          padId: padId,
          username: username,
          email: email
        },
        success: success,
        error: error
      });
      var hideCall = self.hideFeedbackLaterIfNoOtherInteraction();
      function success(msg) {
        setSendingFeedback(false);
        clearFeedback();
        $("#feedbackbox-response").html("Thanks for your feedback").get(0).className = 'goodresponse';
        $("#feedbackbox-response").show();
        window.setTimeout(function() {
          $("#feedbackbox-response").fadeOut('slow', function() {
            hideCall();
          });
        }, 1500);
      }
      function error(e) {
        setSendingFeedback(false);
        $("#feedbackbox-response").html("Could not send feedback.  Please email us at feedback"+"@"+"etherpad.com instead.").get(0).className = 'badresponse';
        $("#feedbackbox-response").show();
      }
    },*/
    sendInvite: function() {
      if (sendingInvite) {
        return;
      }
      if (! pad.isFullyConnected()) {
        displayErrorMessage("Error: Connection to the server is down or flaky.");
        return;
      }
      var message = $("#sharebox-message").val();
      if (! message) {
        displayErrorMessage("Please enter a message body before sending.");
        return;
      }
      var emails = ($("#sharebox-to").hasClass('editempty') ? '' :
                   $("#sharebox-to").val()) || '';
      // find runs of characters that aren't obviously non-email punctuation
      var emailArray = emails.match(/[^\s,:;<>\"\'\/\(\)\[\]{}]+/g) || [];
      if (emailArray.length == 0) {
        displayErrorMessage('Please enter at least one "To:" address.');
        $("#sharebox-to").focus().select();
        return;
      }
      for(var i=0;i<emailArray.length;i++) {
        var addr = emailArray[i];
        if (! addr.match(/^[\w\.\_\+\-]+\@[\w\_\-]+\.[\w\_\-\.]+$/)) {
          displayErrorMessage('"'+padutils.escapeHtml(addr) +
                              '" does not appear to be a valid email address.');
          return;
        }
      }
      var subject = $("#sharebox-subject").val();
      if (! subject) {
        subject = self.getDefaultShareBoxSubjectForName(pad.getUserName());
        $("#sharebox-subject").val(subject); // force the default subject
      }

      var padId = pad.getPadId();
      var username = pad.getUserName();
      setSendingInvite(true);
      $("#sharebox-response").html("Sending...").get(0).className = '';
      $("#sharebox-response").show();
      $.ajax({
        type: 'post',
        url: '/ep/pad/emailinvite',
        data: {
          message: message,
          toEmails: emailArray.join(','),
          subject: subject,
          username: username,
          padId: padId
        },
        success: success,
        error: error
      });
      var hideCall = self.hideShareboxLaterIfNoOtherInteraction();
      function success(msg) {
        setSendingInvite(false);
        $("#sharebox-response").html("Email invitation sent!").get(0).className = 'goodresponse';
        $("#sharebox-response").show();
        window.setTimeout(function() {
          $("#sharebox-response").fadeOut('slow', function() {
            hideCall();
          });
        }, 1500);
      }
      function error(e) {
        setSendingFeedback(false);
        $("#sharebox-response").html("An error occurred; no email was sent.").get(0).className = 'badresponse';
        $("#sharebox-response").show();
      }
      function displayErrorMessage(msgHtml) {
        $("#sharebox-response").html(msgHtml).get(0).className = 'badresponse';
        $("#sharebox-response").show();
      }
    }
  };
  return self;
}());
