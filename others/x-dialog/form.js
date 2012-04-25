/**
 * $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/form.js,v $
 * $Author: mpih $
 * $Revision: 1.20 $
 * $Date: 2011/08/16 23:41:18 $
 *
 * Form methods.
 **/

YAHOO.namespace("convio.form");
YAHOO.convio.form = {

  RESERVED_NAMES : ['page', 'totalcomments', 'lastcommentdate', 'firstcommentdate', 'length'],

  /**
   * Indicates whether a value is empty or not.
   *
   * @return true if empty, otherwise false
   */
  isEmpty: function(value) {
    if (! value || /^\s*$/.exec(value)) {
      return true;
    }

    return false;
  },

  /**
   * Indicates whether a value is longer than N characters.
   */
  checkLength: function(value, length) {
    length = length || 0;
    return (value && value.length && value.length > length);
  },

  checkPattern: function(value, pattern, ignoreCase) {
    if (ignoreCase) {
      value = value.toLowerCase();
    }

    return pattern.exec(value);
  },

  /**
   * Validates a form for duplicate fields. Form fields includes
   * WYSIWYG editor fields.
   *
   * @param element The form field
   * @param name The name of the field
   * @return true if a dupe field is found, otherwise false
   */
  isDupeFieldName: function(element, name) {
    // In some cases, the element passed in is not a form field,
    // so use getAncestorByTagName instead of form.element.
    var form = YAHOO.util.Dom.getAncestorByTagName(element, "form");
    if (form) {
     // Search for a form field with the same name.
      // Note: form.elements[name] did not work for radio buttons,
      //       so instead, we iterate over each form element.
      var testElement;
      var fields = form.elements;
      for (var i=0; i<fields.length; i++) {
        if (fields[i].name && fields[i].name == name) {
          testElement = fields[i];
          break;
        }
      } 
     if (! testElement) {
        // Check for WYSIWYG editor.
        testElement = tinyMCE.activeEditor.getDoc().getElementById(name);
        if (testElement && testElement.nodeName != "TEXTAREA") {
          // Try and find the internal textarea.
          var textarea = testElement.firstChild;
          if (textarea && textarea.nodeName == "TEXTAREA") {
            testElement = textarea;
          }
        } 
      }
      
      if (testElement && testElement.name && testElement != element) {
        if ((element.type == "radio" || element.type == "checkbox") && element.type == testElement.type) {
          // Exceptions:
          // Radio buttons can share names with radio buttons.
          // Checkboxes can share names with checkboxes.
        } else {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Checks whether a name is reserved or not.
   */
  isReservedName: function(name) {
    var lowerName = name.toLowerCase();
    for (var i=0; i<this.RESERVED_NAMES.length; i++) {
      if (lowerName == this.RESERVED_NAMES[i].toLowerCase()) {
        return true;
      }
    }
    return false;
  },

  /**
   * Checks whether the URL is valid.
   */
  checkUrl: function(value, isRelative) {
    var urlPattern = /^(ftp|https?):\/\/(?:[a-zA-Z0-9](?:[-a-z-A-Z0-9]*[a-zA-Z0-9])?)+\b(?:\d+)?(?:\/[^;"'<>()\[\]{}\s\x7f-\xff]*(?:[.,?]+[^;"'<>()\[\]{}\s\x7f-\xff]+)*)?/;

    if (isRelative) {
      //console.debug("++++ is relative");
      var relativePattern = /^\/([a-zA-Z0-9_?&=%,\-\.\/]*$)/;
      if (this.checkPattern(value, relativePattern)) {
        return true;
      }
    }

    return this.checkPattern(value, urlPattern);
  },

  /**
   * Checks whether the value is a valid keyword.
   */
  checkKeyword: function(value) {
    return this.checkPattern(value, /^\w[a-z0-9A-Z\-_]*$/);
  },

  /**
   * Checks whether the value is a valid hostname.
   */
  checkHostname: function(value) {
    return this.checkPattern(value, /^\w[a-z0-9A-Z\-\.]*$/);
  },

  /**
   * Check whether a value is integer or not
   */
  checkInt : function (value) {
	  var intPattern = /^\d+$/;
	  return this.checkPattern(value,intPattern);
  },

  /**
   * Check whether a value is number or not
   */
  checkNum : function(value) {
	  var numPattern = /^(\d+(\.\d*)?|\.\d+)$/;
	  return this.checkPattern(value,numPattern);
  },
  
  /**
   * Check whether a value is an email or not
   */
  checkEmail : function(value) {
    var emailPattern =  /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[a-z]{2}|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|museum)\b/;
    return this.checkPattern(value,emailPattern,true);
  },
  
  /**
   * Check whether a value is a date or not
   */
  checkDate : function(value) {
    var datePattern = /(0?[1-9]|1[012])[- /.](0?[1-9]|[12][0-9]|3[01])[- /.](19|20)\d\d/;
    return this.checkPattern(value,datePattern);
  },  
  
  /**
   * Check to make sure value is number and within the min and max range.
   */
  checkNumRange: function (value, min, max) {
    if (! this.checkNum(value)) {
      return false;
    }
    if (value < min || value > max) {
      return false;
    }
    return true;
  },

  /**
   * Check to make sure value is integer and within the min and max range.
   */
  checkIntRange: function (value, min, max) {
    if (! this.checkInt(value)) {
      return false;
    }
    if (value < min || value > max) {
      return false;
    }
    return true;
  },
  
  /**
   * This function is called by the options-select form-element code, to ensure
   * that each option has a valid name and value.
   */
  labelToName : function(label) {

	  var name = label.toLowerCase();
	  name = name.replace(/\s/g, "_");
	  name = name.replace(/\W/g, "");

	return name;
  },
  
  /**
   * Returns a new name field if certain criteria is met.
   * @param title The current title in the form
   * @param name  The current name in the form
   */
  generateNewName: function(title, name) {
      if( !title ||
             (name != "" && !name.match(/^field/))) {
          return name;
      }
      
      var value = title.toLowerCase();
      value = value.replace(/\s/g, "_");
      value = value.replace(/\W/g, "");

      // BZ 51689 - don't allow button named "submit".
      //            This is to workaround this issue: http://www.spiration.co.uk/post/1232/
      if (value == "submit") {
        value = "_submit";
      }

      return value;
  },
  
  getChildrenWithNodeName : function(parentNode, nodeName) {
    var testfunction = function(node) { 
       if (node.nodeName && node.nodeName == nodeName) {
              return true;
            } else {
              return false;
            }
    };
  
    return YAHOO.util.Dom.getChildrenBy(parentNode, testfunction);
  },
  
  initializeConsTypeSelector : function(folder, type, field) {
    var consTypeSelector = document.getElementById("consTypeSelector");
    consTypeSelector.style.display = "inline";
    var consFieldSelector = document.getElementById("consFieldSelector");
    consFieldSelector.style.display = "inline";
    consFieldSelector.disabled = true;
    //Now load the personalization-categories:
    var dataSourceURL = "/system/components/convio/tiny_mce/plugins/cms_personalization/personalization-categories-retrieve.jsp?folderID=" + folder + "&forRegistration=true&fieldType=" + type;
    //We can create it as usual, from the URL:
    var dataSource = new YAHOO.util.XHRDataSource(dataSourceURL);
    dataSource.responseType = YAHOO.util.XHRDataSource.TYPE_JSON;
    dataSource.responseSchema = {
      resultsList : "categories",
      fields : [
        { key: "CategoryName" }
      ]
    };
    
    var callback = {
      success: function(oRequest, oParsedResponse, oPayload) {
        var consTypeSelector = document.getElementById("consTypeSelector");    
        for (var i = 0 ; i < oParsedResponse.results.length ; i ++) {
          CmsXBrowser.appendOption(consTypeSelector, oParsedResponse.results[i].CategoryName, oParsedResponse.results[i].CategoryName);
        }    
      }        
    };
    
    dataSource.sendRequest(null, callback);
    //And hook up the event handlers:
    var params = {
      folderID : folder,
      fieldType: type
    };
    YAHOO.util.Event.on("consTypeSelector", "change", YAHOO.convio.form.doConsTypeSelector, params);
    params = {
      nameField: field
    };
    YAHOO.util.Event.on("consFieldSelector", "change", YAHOO.convio.form.doConsFieldSelector, params);    
  },
  
  doConsTypeSelector : function(event, params) {
    var consTypeSelector = document.getElementById("consTypeSelector");
    var category = consTypeSelector.options[consTypeSelector.selectedIndex].value;
    var consFieldSelector = document.getElementById("consFieldSelector");
    consFieldSelector.disabled = false;
   
    //Now load the personalization-choices:
    var dataSourceURL = "/system/components/convio/tiny_mce/plugins/cms_personalization/personalization-choices-retrieve.jsp?folderID=" + params.folderID + "&category=" + category + "&forRegistration=true&fieldType=" + params.fieldType;
    //We can create it as usual, from the URL:
    var dataSource = new YAHOO.util.XHRDataSource(dataSourceURL);
    dataSource.responseType = YAHOO.util.XHRDataSource.TYPE_JSON;
    dataSource.responseSchema = {
      resultsList: "choices",
      fields: ["DisplayName", "TemplateID"] 
    };
    
    var callback = {
      success: function(oRequest, oParsedResponse, oPayload) {
        var consFieldSelector = document.getElementById("consFieldSelector");    
        consFieldSelector.length = 1;
        for (var i = 0 ; i < oParsedResponse.results.length ; i ++) {
          CmsXBrowser.appendOption(consFieldSelector, oParsedResponse.results[i].DisplayName, oParsedResponse.results[i].TemplateID);
        }    
      }        
    };
    
    dataSource.sendRequest(null, callback);
  },

  doConsFieldSelector : function(event, params) {
    //OK, we know this is legal, so let's just set it as the name:
    var consFieldSelector = document.getElementById("consFieldSelector");
    var templateID = consFieldSelector.options[consFieldSelector.selectedIndex].value;
    var nameField = document.getElementById(params.nameField);
    nameField.value = templateID;
  }
  
  
  
};
