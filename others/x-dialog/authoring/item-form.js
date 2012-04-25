/**
 * $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/authoring/item-form.js,v $
 * $Author: mpih $
 * $Revision: 1.22 $
 * $Date: 2011/08/12 00:36:16 $
 *
 *
 * Methods associated with a content item form.
 *
 * Depends on:
 *   /components/form/form.js
 *   YAHOO.util.Event
 *   YAHOO.util.Dom
 *   YAHOO.convio.dialog
 */
YAHOO.namespace("convio.item");
YAHOO.convio.item = {

  /**
   * Open the new content item dialog.
   *
   * @param folderID The folderID
   * @param typeID The extended content type ID
   * @param callbackFn The callback function of the form function(item) {}
   */
  showNewItemDialog : function(folderID, typeID, callbackFn) {
    var url = "/components/x-dialog/authoring/item-new.jsp";
    url += "?folderID=" + folderID;
    url += "&typeID=" + typeID;

    var listeners = {
      authenticate : true,

      validate : function(o) {
        YAHOO.convio.item.validate();
      },

      process : function(o) {
        try {
          var response = YAHOO.lang.JSON.parse(o.responseText);
        } catch (e) {
          YAHOO.convio.dialog.showError({detail : e.message, showDetail : true});
          return;
        }

        if (response.status && response.status == "error") {
          // An error occurred trying to create a new item.
          var msg = response.resultDetailHeading || "Failed to create new item";
          var detail = response.resultDetailMessage;
          YAHOO.convio.dialog.showError({msg : msg, detail : detail, showDetail : false});
          return;
        }

        // Set the return value of the new item dialog.
        var item = {
          id : response.itemID,
          text : response.title,
          url : response.url,
          icon : response.icon,
          thumbnail : response.thumbnail
        };

        if (callbackFn) {
          callbackFn(item);
        }
      },

      destroy : function(o) {
        YAHOO.convio.item.destroy();
      }
    };
    YAHOO.convio.dialog.open(url, listeners);
  },

  /**
   * Initializes the author entry form.
   *
   * @param config optional configuration
   *        config.separator filename separator
   */
  init: function(config) {
    var form = YAHOO.convio.dialog.getForm();
    if (! form) {
      alert("No form named '" + form.name + "' to initialize.");
      return; 
    }

    config = config || {};
    config.user = config.user || null;
    config.separator = config.separator || "-";

    this._initTitle(config);

    // TODO: chooser within a chooser doesn't quite work.
    this._initImageChoosers();
    this._initRelatedItemChoosers();

    // TODO: implement newschool dialog.
    this._initCategoryChoosers();

    this._initDateChoosers();
    this._initEditors(config);

    // TODO: location choosers

    this._initFields(config);

    YAHOO.convio.dialog.redraw();
  },

  /**
   * Validates an author entry form.
   */
  validate: function() {
    var form = YAHOO.convio.dialog.getForm();
    if (! form) { 
      alert("No form named '" + form.name + "' to validate.");
      return; 
    }

    // Disable submit buttons during validation.
    this._toggleSubmitButtons(true);

    // Submit editor content.
    this._submitEditors()

    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      if (element.tagName == "INPUT" &&
          (element.type == "hidden" || element.type == "submit")) {
        continue;
      }

      var validation = element.getAttribute("validation");
      if (! validation) { continue; }

      var validator = createValidator(validation);
      validator.label = element.title ? element.title : element.name;

      var isButton = (element.tagName == "INPUT" && 
                      element.type == "checkbox" || element.type == "radio");
      var selectionMissed = false;

      if (isButton && validator.required) {
        selectionMissed = ! element.checked;
        var a = elements[element.name];
        if (a.length) {
          for (var j = 0; j < a.length; j++) {
            if (a[j].checked) {
              selectionMissed = false;
              break;
            }
          }
        } 
      }

      var value = this._getSubmittedValue(element);

      if (selectionMissed || ! validator.validate(value)) {

        var msg = selectionMissed ? 
        "Please make at least one selection for " + element.name : 
        validator.message;

        YAHOO.convio.dialog.addError(msg);

        if (element.style.display != "none" &&
            element.style.visibility != "hidden") { 
          element.focus();
        } 

        this._toggleSubmitButtons(false);

        return false;
      }
    }
  
    this._check4KLengths(form);

    return validateCaptcha(form.name);
  },

  /**
   * Destroys the new item dialog.
   */
  destroy : function() {
    this._destroyEditors();
  },

  /**
   * Title is always required.
   */
  _initTitle : function(config) {
    var f = YAHOO.convio.dialog.getForm();

    var title = f.elements["title"];
    if (title) {
      title.validation = title.validation ? 
        title.validation + ";required:true" : "required:true";

      YAHOO.util.Event.on(title, "blur", this._updateFileName, config, this);
    }
  },

  /**
   * Auto-generate filename from title.
   */
  _updateFileName : function(config) {
    var f = YAHOO.convio.dialog.getForm();

    var fileName = f.elements["filename"];
    if (fileName == null || fileName.value != "") { return; }

    var title = f.elements["title"];
    if (! title || title.value == null) { return; }

    fileName.value = labelToFileName(truncate(title.value, 30, true, ""), config.separator);
  },

  /**
   * Initialize form fields and register validators.
   */
  _initFields : function(config) {
    var f = YAHOO.convio.dialog.getForm();

    var elements = f.elements;
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];

      // Trim text areas.
      if (element.tagName == "TEXTAREA") {
        element.innerText = trimString(element.innerText);
      }

      // Add "None" choice to optional pick lists. 
      if (element.tagName == "SELECT" && element.size > 1 &&
	  (! element.validation || element.validation.indexOf("required:true") == -1)) {
        var option = document.createElement("OPTION");
        option.innerText = "None";
        option.value = "";
        element.insertBefore(option, element.firstChild);
      }

      if (! element.validation) { continue; }

      // Register validators.
      var validator = createValidator(element.validation);

      // Add CSS for required fields.
      var isButton = (element.tagName == "INPUT" && 
                      (element.type == "checkbox" || element.type == "radio"));
      if (validator.required && ! isButton) {
        YAHOO.util.Dom.addClass(element, "formWidgetRequired");
      }

      if (validator.standard && config.user && validator.defaultRule == "user") {
        if (config.user[validator.standard]) {
          element.value = config.user[validator.standard];
        }
      }
    }
  },

  /**
   * Determines whether the form contains a file upload field.
   */
  _hasFileUpload : function(form) {
    var f = YAHOO.convio.dialog.getForm();
    var hasFileUpload = false;
    for (var i = 0; i < f.elements.length; i++) {
      var element = elements[i];
      if (element.type && element.type == "file") {
        hasFileUpload = true;
        break;
      }
    }

    return hasFileUpload;
  },

  /**
   * Enables/disables buttons in the current dialog.
   */
  _toggleSubmitButtons : function(isDisabled) {
    var buttons = YAHOO.convio.dialog.getButtons();
    for (var i=0; i<buttons.length; i++) {
      buttons[i].set("disabled", isDisabled);
    }
  },

  /**
   * Validates 4K length limit on CCT form fields.
   */
  _check4KLengths: function(form) {
    var th = this;

    var isNotBodyFieldFn = function(el) {
      return !(el.name == "body" || el.id == "body");
    };

    var check4KLengthFn = function(el) {
      var value = th._getSubmittedValue(el);
      if (value && value.length > 3990) {
        el.focus();
        YAHOO.convio.dialog.addError
        ("The text of field '" + el.name + 
         "' is longer than the limit of 4000 characters.");
      }
    };

    // All standard form elements.
    YAHOO.util.Dom.getElementsBy(isNotBodyFieldFn, null, form, check4KLengthFn);
  },

  /**
   * Fetches a validation property. e.g., <div validation="config:basic;type:text">.
   */
  _getValidationProperty : function(node, property, value) {

    var validation = YAHOO.util.Dom.getAttribute(node, 'validation');
    if (! validation) { return value; }

    var pos = validation.indexOf(property + ":");
    if (pos == -1) { return value; }

    var end = validation.indexOf(";", pos);
    if (end == -1) { end = validation.length; }

    var value = validation.substring(pos + property.length + 1, end);
    return value;
  },
        
  /**
   * WYSIWYG editor init. Treats all editors as MCE editors.
   * Editors have the form: <div class="frontleaf-editor"></div>
   */
  _initEditors : function(config) {
    if (! config) { 
      alert("config required");
      return;
    }

    var form = YAHOO.convio.dialog.getForm();
    if (! form) { return; }

    // editor common settings
    var localSettings = {
      content_css: config.tinymceCSS,
      cmsFolderID: config.folderID,
      cmsItemID: config.itemID,
      cmsTypeID: config.typeID,
      cmsSubsiteID: config.rootFolderID,
      isNew: 'true'
    };
  
    var mceInitCallback = function(inst) {
      // do nothing
    };

    var divs = YAHOO.util.Dom.getElementsByClassName("frontleaf-editor", "textarea", form);
    if (divs.length > 0) {
      for (var i=0; i<divs.length; i++) {
        var div = divs[i];

        var name = div.id;
        var height = div.height || "200px";

        // Generate the MCE configuration based on the specified editor mode (e.g., basic, advanced)
        // and use context (e.g., body, custom field).
        var settings = MceConfigUtils.GetMceSettings(MceConfigUtils.itemchooserdialog, name, MceConfigUtils.mode_exact);
        settings = MceConfigUtils.MergeSettings(settings, {
            height: height,
            width: "100%",
            init_instance_callback: mceInitCallback
          });
        settings = MceConfigUtils.MergeSettings(settings, localSettings);

        // Initialize the editor.
        var ed = new tinymce.Editor(name, settings);
        ed.init();
        ed.render();
      }
    }
  },

  /**
   * Saves the editor contents to a hidden form field.
   */
  _submitEditors : function() {
    var form = YAHOO.convio.dialog.getForm();
    if (! form) { return; }

    var divs = YAHOO.util.Dom.getElementsByClassName("frontleaf-editor", "div", form);
    if (divs.length > 0) {
      for (var i=0; i<divs.length; i++) {
        var div = divs[i];

        var name = div.id;
        var ed = tinyMCE.get(name);
        if (ed) {
          ed.save();
        }
      }
    }
  },

  /**
   * Removes the editor state and editor from the DOM.
   */
  _destroyEditors : function() {
    var form = YAHOO.convio.dialog.getForm();
    if (! form) { return; }

    var divs = YAHOO.util.Dom.getElementsByClassName("frontleaf-editor", "div", form);
    if (divs.length > 0) {
      for (var i=0; i<divs.length; i++) {
        var div = divs[i];

        var name = div.id;
        var ed = tinyMCE.get(name);
        if (ed) {
          ed.remove();
        }
      }
    }
  },

  /**
   * Date chooser init.
   */
  _initDateChoosers : function() {
    var form = YAHOO.convio.dialog.getForm();
    if (! form) {return; }

    var loader = new YAHOO.util.YUILoader();
    loader.addModule({
        name : "date-chooser",
        type : "js",
        fullpath : "/system/components/date-chooser/date-chooser.js",
        requires : ["dom", "calendar", "button"]
      });
    loader.require("date-chooser");
    loader.loadOptional = true;
    loader.base = '/system/components/yui/';
    loader.onSuccess = function() {
      YAHOO.convio.DateChooser.initDateFields(form);
    };
    loader.insert();
  },

  /**
  ///// Image chooser.
  */

  /**
   * Initializes all image choosers within the form. Image choosers are denoted by:
   *   <div class="image-chooser">...</div>
   */
  _initImageChoosers : function() {
    var form = YAHOO.convio.dialog.getForm();
    if (! form) { return; }

    var divs = form.getElementsByTagName("DIV");
    for (var i = 0; i < divs.length; i++) {
      var div = divs[i];
      if (div.className == "image-chooser") {
        this._initImageChooser(div);
      }
    }
  },

  _initImageChooser : function(div) {

    var selector = YAHOO.util.Dom.getFirstChildBy(div, function(n) {
        return (n && n.tagName == 'SELECT');
      });
    if (! selector) {
      return;
    }

    selector.style.visibility = "hidden";
    selector.style.width = "1px";

    // Remove extra whitespace/nodes.
    while (selector.previousSibling) {
      CmsXBrowser.removeNode(selector.previousSibling, true);
    }
    while (selector.nextSibling) {
      CmsXBrowser.removeNode(selector.nextSibling, true);
    }

    var thumbnail = document.createElement("DIV");
    thumbnail.id = "thumbnail-" + div.name;
    thumbnail.className = "imageChooser";
    thumbnail.innerHTML = "No<br>image<br>selected";
    div.appendChild(thumbnail);

    var chooseButton = CmsXBrowser.createButton(document);
    chooseButton.className = "button";
    chooseButton.value = "Choose...";
    chooseButton.onclick = this._clickImageChooser;
    div.appendChild(chooseButton);
    
    var space = document.createElement("SPAN");
    space.innerHTML = "&nbsp;&nbsp;";
    div.appendChild(space);

    var clearButton = CmsXBrowser.createButton(document);
    clearButton.className = "button";
    clearButton.value = "Clear";
    clearButton.onclick = this._clearImageChooser;
    div.appendChild(clearButton);

    div.style.visibility = "visible";
    
    var initValues = document.getElementById(selector.name + "Items");
    if (! initValues) { return; }
    
    var items = new Array();
    for (var i = 0; i < initValues.childNodes.length; i++) {
      var initValue = initValues.childNodes[i];
      var item = new Object();
      item.id = initValue.id;
      item.title = initValue.childNodes[0].innerHTML;
      item.icon = initValue.childNodes[1].innerHTML;
      item.thumbnail = initValue.childNodes[2].innerHTML;
      items.push(item);
    }
    
    this._fillImageChooser(items, selector);
  },

  _clickImageChooser : function() {

    var selector = this.parentNode.firstChild;
    var model = selector.getAttribute("model");
      if (! model || ! model.match(/items;filterID=(\d+)/)) {
      return;
    }

    var items = new Array();
    
    if (selector.nextSibling.firstChild && 
        selector.nextSibling.firstChild.tagName == "TABLE") {
      var container = selector.nextSibling.firstChild.lastChild.lastChild;
      for (var i = 0; i < container.childNodes.length; i++) {
        var element = container.childNodes[i];
        var input = element.lastChild;
        if (input.tagName != "INPUT") { continue; }
        var item = new Object();
        item.id = input.value;
        item.title = input.title;
        item.icon = input.icon;
        item.thumbnail = input.thumbnail;
        items.push(item);
      }
    }
    
    var filterID = RegExp.$1;
    
    var config = {
      filterID: filterID,
      showLinks: true,
      links: items,
      basetype: 'image',
      selectiontype: 'image'
    };

    // Show the image chooser, passing in the config params.
    YAHOO.convio.itemchooser.showItemChooser(gFolderID, config, function(returnVal) {
      YAHOO.convio.item._fillImageChooser(returnVal, selector);
    });
  },

  _fillImageChooser : function(items, selector) {
    selector.innerHTML = "";

    var container = selector.nextSibling;
    container.innerHTML = "";    

    if (! items) {
      container.innerHTML = "<div><em>No images selected</em></div>";
      return;
    }

    var table = document.createElement("TABLE");
    container.appendChild(table);

    var tbody = document.createElement("TBODY");
    table.appendChild(tbody);

    var imgRow = document.createElement("TR");
    tbody.appendChild(imgRow);

    var labelRow = document.createElement("TR");
    tbody.appendChild(labelRow);

    for (var i=0; i < items.length; i++) {
      var item = items[i];

      var img = document.createElement("IMG");
      img.src = item.thumbnail;

      var cell = document.createElement("TD");
      cell.appendChild(img);
      cell.style.verticalAlign = "middle";
      cell.style.textAlign = "center";
      imgRow.appendChild(cell);

      var label = document.createElement("TD");
      label.innerHTML = item.title;
      label.style.textAlign = "center";
      label.style.fontSize = "12px";
      labelRow.appendChild(label);

      var option;
      if (YAHOO.env.ua.ie > 0 && YAHOO.env.ua.ie < 9) {
        option = document.createElement("<INPUT TYPE=HIDDEN NAME='" + selector.name + "' />");
      } else {
        option = document.createElement("INPUT");
        option.type = "hidden";
        option.name = selector.name;
      }   
      option.value = item.id;
      option.title = item.title;
      option.icon = item.icon;
      option.thumbnail = item.thumbnail;

      label.appendChild(option);
    }
  },

  _clearImageChooser : function() {
    var selector = this.parentNode.firstChild;
    var model = selector.getAttribute("model");
    if (! model || ! model.match(/items;filterID=(\d+)/)) {
      return;
    }

    selector.innerHTML = "";
    var container = selector.nextSibling;
    container.innerHTML = "";    
  },

  /**
  ///// Related item chooser.
  */

  /**
   * Initializes all related-item choosers within the form. Such choosers are denoted by:
   *   <div class="related-item-chooser">...</div>
   */
  _initRelatedItemChoosers : function() {

    var form = YAHOO.convio.dialog.getForm();
    if (! form) { return; }

    var divs = form.getElementsByTagName("DIV");
    for (var i = 0; i < divs.length; i++) {
      var div = divs[i];
      if (div.className == "related-item-chooser") {
        this._initRelatedItemChooser(div);
      }
    }
  },

  _initRelatedItemChooser : function(div) {
    var selector = YAHOO.util.Dom.getFirstChildBy(div, function(n) {
        return (n && n.tagName == 'SELECT');
      });
    if (! selector) {
      return;
    }

    selector.style.visibility = "hidden";
    selector.style.width = "1px";

    // Remove extra whitespace/nodes.
    while (selector.previousSibling) {
      CmsXBrowser.removeNode(selector.previousSibling, true);
    }
    while (selector.nextSibling) {
      CmsXBrowser.removeNode(selector.nextSibling, true);
    }

    var list = document.createElement("DIV");
    list.id = "thumbnail-" + div.name;
    list.className = "relatedItemsChooser";
    list.innerHTML = "<div><em>No items selected</em></div>";
    list.style.fontSize = "12px";
    div.appendChild(list);

    var chooseButton = CmsXBrowser.createButton(document);
    chooseButton.className = "button";
    chooseButton.value = "Choose...";
    chooseButton.onclick = this._clickRelatedItemChooser;
    div.appendChild(chooseButton);

    var space = document.createElement("SPAN");
    space.innerHTML = "&nbsp;&nbsp;";
    div.appendChild(space);

    var clearButton = CmsXBrowser.createButton(document);
    clearButton.className = "button";
    clearButton.value = "Clear";
    clearButton.onclick = this._clearRelatedItemChooser;
    div.appendChild(clearButton);

    div.style.visibility = "visible";

    var initValues = document.getElementById(selector.name + "Items");
    if (! initValues) { return; }

    var items = new Array();
    for (var i = 0; i < initValues.childNodes.length; i++) {
      var initValue = initValues.childNodes[i];
      var item = new Object();
      item.id = initValue.id;
      item.title = initValue.childNodes[0].innerHTML;
      item.icon = initValue.childNodes[1].innerHTML;
      item.thumbnail = initValue.childNodes[2].innerHTML;
      items.push(item);
    }

    this._fillRelatedItemChooser(items, selector);
  },

  _clickRelatedItemChooser: function() {
    var selector = this.parentNode.firstChild;
    var model = selector.getAttribute("model");
    if (! model || ! model.match(/items;filterID=(\d+)/)) {
      return;
    }

    var items = new Array();
    var container = selector.nextSibling;
    for (var i = 0; i < container.childNodes.length; i++) {
      var element = container.childNodes[i];
      var input = element.lastChild;
      if (input.tagName != "INPUT") { continue; }
      var item = new Object();
      item.id = input.value;
      item.title = input.title;
      item.icon = input.icon;
      item.thumbnail = input.thumbnail;
      items.push(item);
    }

    var filterID = RegExp.$1;

    var config = {
      filterID: filterID,
      showLinks: true,
      links: items
    }; 
  
    // Show the item chooser, passing in the config params.
    YAHOO.convio.itemchooser.showItemChooser(gFolderID, config, function(returnVal) {
      YAHOO.convio.item._fillRelatedItemChooser(returnVal, selector);
    });
  },

  _fillRelatedItemChooser : function(items, selector) {

    selector.innerHTML = "";

    var container = selector.nextSibling;
    container.innerHTML = "";    

    if (! items) {
      container.innerHTML = "<div><em>No items selected</em></div>";
      return;
    }

    for (var i = 0; i < items.length; i++) {

      var item = items[i];

      var div = document.createElement("DIV");

      var img = document.createElement("IMG");
      img.src = item.icon;
      img.align = "absmiddle";
      div.appendChild(img);

      var label = document.createElement("SPAN");
      label.innerHTML = "&nbsp;" + item.title;
      label.style.fontSize = "14px";
      label.style.padding = "4px";
      div.appendChild(label);

      var option;
      if (YAHOO.env.ua.ie > 0 && YAHOO.env.ua.ie < 9) {
        option = document.createElement("<INPUT TYPE=HIDDEN NAME='" + selector.name + "' />");
      } else {
        option = document.createElement("INPUT");
        option.type = "hidden";
        option.name = selector.name;
      }   
      option.value = item.id;
      option.title = item.title;
      option.icon = item.icon;
      option.thumbnail = item.thumbnail;

      div.appendChild(option);

      container.appendChild(div);
    }
  },

  _clearRelatedItemChooser : function() {

    var selector = this.parentNode.firstChild;
    var model = selector.getAttribute("model");
    if (! model || ! model.match(/items;filterID=(\d+)/)) {
      return;
    }

    selector.innerHTML = "";
    var container = selector.nextSibling;
    container.innerHTML = "";    
  },

  /**
  ///// Category chooser.
  */

  /**
   * Initializes all category choosers within the form. Such choosers are denoted by:
   *   <div class="category-chooser">...</div>
   */
  _initCategoryChoosers : function() {
    var form = YAHOO.convio.dialog.getForm();
    if (! form) { return; }

    var divs = form.getElementsByTagName("DIV");
    for (var i = 0; i < divs.length; i++) {
      var div = divs[i];
      if (div.className == "category-chooser") {
        this._initCategoryChooser(div);
      }
    }
  },

  _initCategoryChooser : function(div) {
    var selector = YAHOO.util.Dom.getFirstChildBy(div, function(n) {
        return (n && n.tagName == 'SELECT');
      });
    if (! selector) {
      return;
    }

    selector.style.visibility = "hidden";
    selector.style.width = "1px";

    // Remove extra whitespace/nodes.
    while (selector.previousSibling) {
      CmsXBrowser.removeNode(selector.previousSibling, true);
    }
    while (selector.nextSibling) {
      CmsXBrowser.removeNode(selector.nextSibling, true);
    }

    var list = document.createElement("DIV");
    list.id = "thumbnail-" + div.name;
    list.className = "relatedItemsChooser";
    list.innerHTML = "<div><em>No categories selected</em></div>";
    list.style.fontSize = "12px";
    div.appendChild(list);

    var chooseButton = CmsXBrowser.createButton(document);
    chooseButton.className = "button";
    chooseButton.value = "Choose...";
    chooseButton.onclick = this._clickCategoryChooser;
    div.appendChild(chooseButton);

    var space = document.createElement("SPAN");
    space.innerHTML = "&nbsp;&nbsp;";
    div.appendChild(space);

    var clearButton = CmsXBrowser.createButton(document);
    clearButton.className = "button";
    clearButton.value = "Clear";
    clearButton.onclick = this._clearCategoryChooser;
    div.appendChild(clearButton);

    div.style.visibility = "visible";

    var initValues = document.getElementById(selector.name + "Categories");
    if (! initValues) { return; }

    var items = new Array();
    for (var i = 0; i < initValues.childNodes.length; i++) {
      var initValue = initValues.childNodes[i];
      var item = new Object();
      item.id = initValue.id;
      item.title = initValue.childNodes[0].innerHTML;
      item.icon = initValue.childNodes[1].innerHTML;
      item.thumbnail = initValue.childNodes[2].innerHTML;
      items.push(item);
    }

    this._fillCategoryChooser(items, selector);
  },

  _clickCategoryChooser : function() {
    var selector = this.parentNode.firstChild;
    var model = selector.getAttribute("model");
    if (! model || ! model.match(/categories;categoryID=(\d+)/)) {
      return;
    }

    var items = new Array();
    var container = selector.nextSibling;
    for (var i = 0; i < container.childNodes.length; i++) {
      var element = container.childNodes[i];
      var input = element.lastChild;
      if (input.tagName != "INPUT") { continue; }
      var item = new Object();
      item.id = input.value;
      item.title = input.title;
      item.icon = input.icon;
      item.thumbnail = input.thumbnail;
      items.push(item);
    }

    var categoryID = RegExp.$1;

    var path = "/admin/components/category/dialog.jsp";

    var result = showDialog(path + "?categoryID=" + categoryID, items);
    if (! result) { return; }

    YAHOO.convio.item._fillCategoryChooser(result, selector);
  },

  _fillCategoryChooser : function(items, selector) {

    selector.innerHTML = "";

    var container = selector.nextSibling;
    container.innerHTML = "";    

    if (! items) {
      container.innerHTML = "<div><em>No categories selected</em></div>";
      return;
    }

    for (var i = 0; i < items.length; i++) {

      var item = items[i];

      var div = document.createElement("DIV");

      var img = document.createElement("IMG");
      img.src = item.icon;
      img.align = "absmiddle";
      div.appendChild(img);

      var label = document.createElement("SPAN");
      label.innerHTML = "&nbsp;" + item.title;
      label.style.fontSize = "14px";
      label.style.padding = "4px";
      div.appendChild(label);

      var option;
      if (YAHOO.env.ua.ie > 0 && YAHOO.env.ua.ie < 9) {
        option = document.createElement("<INPUT TYPE=HIDDEN NAME='" + selector.name + "' />");
      } else {
        option = document.createElement("INPUT");
        option.type = "hidden";
        option.name = selector.name;
      }   
      option.value = item.id;
      option.title = item.title;
      option.icon = item.icon;
      option.thumbnail = item.thumbnail;

      div.appendChild(option);

      container.appendChild(div);
    }
  },

  _clearCategoryChooser : function() {
    var selector = this.parentNode.firstChild;
    var model = selector.getAttribute("model");
    if (! model || ! model.match(/categories;categoryID=(\d+)/)) {
      return;
    }

    selector.innerHTML = "";
    var container = selector.nextSibling;
    container.innerHTML = "";    
  },

  _isRTF: function(n) {
    if ((typeof tinyMCE) != 'undefined' && tinyMCE && tinyMCE.editors) {
      if (n.id != null && n.nodeName.toLowerCase() == "textarea"
          && n.style && n.style.display == "none"
          && n.className && n.className.indexOf("frontleaf-editor") != -1) {
        if (tinyMCE.get(n.id)) {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Fetches the value of the form field.
   */
  _getSubmittedValue: function(element) {
    if (! element) { return null; }

    var value = element.value;

    if (this._isRTF(element)) {
      // The value stored in the hidden textarea is the original value.
      // The actual value for RTF fields is fetched via editor.getContent().

      var editor = tinyMCE.get(element.id);
      value = editor.getContent();
    }
    else if (element.style.display == "none" ||
             element.style.visibility == "hidden") { 

      var form = YAHOO.convio.dialog.getForm();
      var hiddenElements = form.getElementsByTagName("INPUT");
      for (var j=0; j<hiddenElements.length; j++) {
        var he = hiddenElements[j];
        if (he.type != "hidden" || he.name != element.name) { continue; }
        if (he.value) {
          value = he.value;
          break;
        }
      }
    }
    return value;
  }

};
