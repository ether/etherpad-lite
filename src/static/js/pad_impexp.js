/**
 * This code is mostly from the old Etherpad. Please help us to comment this code. 
 * This helps other people to understand this code better and helps them to improve it.
 * TL;DR COMMENTS ON THIS FILE ARE HIGHLY APPRECIATED
 */

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

var paddocbar = require('./pad_docbar').paddocbar;

var padimpexp = (function()
{

  ///// import
  var currentImportTimer = null;
  var hidePanelCall = null;

  function addImportFrames()
  {
    $("#import .importframe").remove();
    var iframe = $('<iframe style="display: none;" name="importiframe" class="importframe"></iframe>');
    $('#import').append(iframe);
  }

  function fileInputUpdated()
  {
    $('#importformfilediv').addClass('importformenabled');
    $('#importsubmitinput').removeAttr('disabled');
    $('#importmessagefail').fadeOut("fast");
    $('#importarrow').show();
    $('#importarrow').animate(
    {
      paddingLeft: "0px"
    }, 500).animate(
    {
      paddingLeft: "10px"
    }, 150, 'swing').animate(
    {
      paddingLeft: "0px"
    }, 150, 'swing').animate(
    {
      paddingLeft: "10px"
    }, 150, 'swing').animate(
    {
      paddingLeft: "0px"
    }, 150, 'swing').animate(
    {
      paddingLeft: "10px"
    }, 150, 'swing').animate(
    {
      paddingLeft: "0px"
    }, 150, 'swing');
  }

  function fileInputSubmit()
  {
    $('#importmessagefail').fadeOut("fast");
    var ret = window.confirm("Importing a file will overwrite the current text of the pad." + " Are you sure you want to proceed?");
    if (ret)
    {        
      hidePanelCall = paddocbar.hideLaterIfNoOtherInteraction();
      currentImportTimer = window.setTimeout(function()
      {
        if (!currentImportTimer)
        {
          return;
        }
        currentImportTimer = null;
        importFailed("Request timed out.");
      }, 25000); // time out after some number of seconds
      $('#importsubmitinput').attr(
      {
        disabled: true
      }).val("Importing...");
      window.setTimeout(function()
      {
        $('#importfileinput').attr(
        {
          disabled: true
        });
      }, 0);
      $('#importarrow').stop(true, true).hide();
      $('#importstatusball').show();
    }
    return ret;
  }

  function importFailed(msg)
  {
    importErrorMessage(msg);
  }

  function importDone()
  {
    $('#importsubmitinput').removeAttr('disabled').val("Import Now");
    window.setTimeout(function()
    {
      $('#importfileinput').removeAttr('disabled');
    }, 0);
    $('#importstatusball').hide();
    importClearTimeout();
    addImportFrames();
  }

  function importClearTimeout()
  {
    if (currentImportTimer)
    {
      window.clearTimeout(currentImportTimer);
      currentImportTimer = null;
    }
  }

  function importErrorMessage(status)
  {
    var msg="";
  
    if(status === "convertFailed"){
      msg = "We were not able to import this file. Please use a different document format or copy paste manually";
    } else if(status === "uploadFailed"){
      msg = "The upload failed, please try again";
    }
  
    function showError(fade)
    {
      $('#importmessagefail').html('<strong style="color: red">Import failed:</strong> ' + (msg || 'Please copy paste'))[(fade ? "fadeIn" : "show")]();
    }

    if ($('#importexport .importmessage').is(':visible'))
    {
      $('#importmessagesuccess').fadeOut("fast");
      $('#importmessagefail').fadeOut("fast", function()
      {
        showError(true);
      });
    }
    else
    {
      showError();
    }
  }

  function importSuccessful(token)
  {
    $.ajax(
    {
      type: 'post',
      url: '/ep/pad/impexp/import2',
      data: {
        token: token,
        padId: pad.getPadId()
      },
      success: importApplicationSuccessful,
      error: importApplicationFailed,
      timeout: 25000
    });
    addImportFrames();
  }

  function importApplicationFailed(xhr, textStatus, errorThrown)
  {
    importErrorMessage("Error during conversion.");
    importDone();
  }

  ///// export

  function cantExport()
  {
    var type = $(this);
    if (type.hasClass("exporthrefpdf"))
    {
      type = "PDF";
    }
    else if (type.hasClass("exporthrefdoc"))
    {
      type = "Microsoft Word";
    }
    else if (type.hasClass("exporthrefodt"))
    {
      type = "OpenDocument";
    }
    else
    {
      type = "this file";
    }
    alert("Exporting as " + type + " format is disabled. Please contact your" + " system administrator for details.");
    return false;
  }

  /////
  var pad = undefined;
  var self = {
    init: function(_pad)
    {
      pad = _pad;

      //get /p/padname
      var pad_root_path = new RegExp(/.*\/p\/[^\/]+/).exec(document.location.pathname)
      //get http://example.com/p/padname
      var pad_root_url = document.location.href.replace(document.location.pathname, pad_root_path)

      // build the export links
      $("#exporthtmla").attr("href", pad_root_path + "/export/html");
      $("#exportplaina").attr("href", pad_root_path + "/export/txt");
      $("#exportdokuwikia").attr("href", pad_root_path + "/export/dokuwiki");
      
      //hide stuff thats not avaible if abiword is disabled
      if(clientVars.abiwordAvailable == "no")
      {
        $("#exportworda").remove();
        $("#exportpdfa").remove();
        $("#exportopena").remove();
        $(".importformdiv").remove();
        $("#import").html("Import is not available.  To enable import please install abiword");
      }
      else if(clientVars.abiwordAvailable == "withoutPDF")
      {
        $("#exportpdfa").remove();
        
        $("#exportworda").attr("href", pad_root_path + "/export/doc");
        $("#exportopena").attr("href", pad_root_path + "/export/odt");
        
        $("#importexport").css({"height":"142px"});
        $("#importexportline").css({"height":"142px"});
        
        $("#importform").attr('action', pad_root_url + "/import"); 
      }
      else
      {
        $("#exportworda").attr("href", pad_root_path + "/export/doc");
        $("#exportpdfa").attr("href", pad_root_path + "/export/pdf");
        $("#exportopena").attr("href", pad_root_path + "/export/odt");
        
        $("#importform").attr('action', pad_root_path + "/import"); 
      }
    
      $("#impexp-close").click(function()
      {
        paddocbar.setShownPanel(null);
      });

      addImportFrames();
      $("#importfileinput").change(fileInputUpdated);
      $('#importform').submit(fileInputSubmit);
      $('.disabledexport').click(cantExport);
    },
    handleFrameCall: function(status)
    {
      if (status !== "ok")
      {
        importFailed(status);
      }
      
      importDone();
    },
    disable: function()
    {
      $("#impexp-disabled-clickcatcher").show();
      $("#import").css('opacity', 0.5);
      $("#impexp-export").css('opacity', 0.5);
    },
    enable: function()
    {
      $("#impexp-disabled-clickcatcher").hide();
      $("#import").css('opacity', 1);
      $("#impexp-export").css('opacity', 1);
    }
  };
  return self;
}());

exports.padimpexp = padimpexp;
