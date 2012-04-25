/**
 * Toolbar objects.
 **/

YAHOO.namespace("convio.toolbar");

/**
 * Create Calendar 
 * @param o Object (id: calendar id, required, 
 * 		            text: calendar text, optional, 
 * 	                value: selected date, optional)
 */
YAHOO.convio.toolbar.ToolbarCalendar = function (o) {
  this.id = o.id;
  this.title = o.title ? o.title : '';
  
  this.type = "input";
  this.isEnabled = true;

  this.cell = document.createElement("div");
  this.cell.className = "tool";
  this.cell.id = "ToolbarInput_" + this.id;
  this.cell.name = this.id;
  this.cell.title = this.title;
  
  if (o.value) {
    this.cell.innerHTML = o.value;
  }
  
  this.calendar = new YAHOO.convio.widget.Calendar(this.cell);
  
  YAHOO.convio.toolbar.ToolbarCalendar.prototype.getValue = function() {
    return this.calendar.getValue();
  };

  YAHOO.convio.toolbar.DropDown.prototype.setEnabled = function(isEnabled) {
    this.calendar.setEnabled(isEnabled);
  };

};

/**
 * 
 * @param o Dropdown object (id: required, listData: required, text: required, onclick: optional)
 * listData must be array of objects (id: required, text: required)
 */
YAHOO.convio.toolbar.DropDown = function(o) {
  if (! o.id ) {
    alert("id is required");
    return;
  }
  if (! o.listData) {
    alert("listData is required");
    return;		
  }
  if (! o.text) {
    alert("text is required");
    return;		
  }
  this.id = o.id;
  this.listData = o.listData;
  this.title = o.text;
	
  this.cell = document.createElement("div");
  this.cell.className = "tool";
  this.cell.id = "ToolbarButton_" + this.id;
	

  var textContainer = document.createElement('span');
  textContainer.innerHTML = this.title;
  YAHOO.util.Dom.addClass(textContainer, 'xGridToolbarSelectText');
  this.cell.appendChild(textContainer);
    
  var listContainer = document.createElement('select');
  listContainer.id = this.id;		    		    
  YAHOO.util.Dom.addClass(listContainer, 'xGridToolbarSelect');
  if (o.onclick) {
    for (var m=0; m<o.onclick.length; m++) {
      YAHOO.util.Event.on(listContainer.id, "click", o.onclick[m]);
    }
  }
  if (o.onchange) {
    for (var m=0; m<o.onchange.length; m++) {
      YAHOO.util.Event.on(listContainer.id, "change", o.onchange[m]);
    }
  }
  
  this.list = listContainer;

  for(var i=0; i< this.listData.length; i++) {
    var option = document.createElement('option');
    option.id = this.listData[i].id;
    option.value = this.listData[i].id;
    option.innerHTML = this.listData[i].text;
    if (this.listData[i].selected) {
      option.selected = "selected";
    }
    listContainer.appendChild(option);
  }

    
  this.cell.appendChild(listContainer);
    
  YAHOO.convio.toolbar.DropDown.prototype.setEnabled = function(isEnabled) {
    this.isEnabled = isEnabled;    	
    this.list.disabled = (! isEnabled);
  };

  YAHOO.convio.toolbar.DropDown.prototype.getValue = function() {
    return this.list.value;
  };
    
};

/**
 * 
 * @param o Button object (id: required, text: required if it is simple button, image: object for image button, onclick: optional)
 */
YAHOO.convio.toolbar.ToolbarButton = function(o) {
  if (! o.id) {
    alert("id is required");
    return;		
  }

  if (! o.text && ! o.img ) {
    alert("text or img is required");
    return;		
  }

  this.id = o.id;
  this.type = "button";
  this.oImage = o.img;
  this.title = o.text;
  this.isEnabled = true;
  this.alwaysDisabled = false; 
  this.onclick = o.onclick || null;
	  	
  this.cell = document.createElement("div");
  this.cell.className = "tool button";
  this.cell.id = "ToolbarButton_" + this.id;
	
  if (this.oImage != undefined) {
    var img = document.createElement("IMG");
    img.setAttribute("src",  this.oImage.url);
    img.setAttribute("title", this.oImage.title);
    img.setAttribute("align", "absmiddle");
    if (this.oImage.width != null) {
      img.setAttribute("width", this.oImage.width);
    }
    if (this.oImage.height != null) {
      img.setAttribute("height", this.oImage.height);
    }
    if (this.oImage.alt != null) {
      img.setAttribute("alt", this.oImage.alt);
    } else {
      img.setAttribute("alt", this.oImage.title);
    }	   	   
    this.cell.appendChild(img);
    if (this.oImage.withLink) {
      var link = document.createElement("span");
      link.innerHTML=this.oImage.title;
      this.cell.appendChild(link);
      YAHOO.util.Dom.addClass(this.cell, 'withLink');
    }
  } else {
    this.button = document.createElement("input");
    this.button.value = this.title;
    this.button.type = "button";    
    this.cell.appendChild(this.button);
    YAHOO.util.Dom.removeClass(this.cell, 'button');
  }

  if (this.onclick) {
    var th = this;
    YAHOO.util.Event.on(this.cell.id, "click", function() {
        if (this.isEnabled) {
          this.onclick();
        }
      }, this, this);
  }
  
  YAHOO.convio.toolbar.ToolbarButton.prototype.setEnabled = function(isEnabled) {
    if (this.alwaysDisabled) {
      this.isEnabled = false;
    } else {
      this.isEnabled = isEnabled;
    }
    this.cell.className = (this.isEnabled) ? "tool button" : "tool button inactive";
  };
  	
};


/**
 * TextBox tool.
 * @param o A TextBox object (id: required, text: required, value: optional)
 */
YAHOO.convio.toolbar.TextBox = function(o) {
  if (! o.id ) {
    alert("id is required");
    return;
  }
  if (! o.text) {
    alert("text is required");
    return;		
  }
  this.id = o.id;
  this.title = o.text;
	
  this.cell = document.createElement("div");
  this.cell.className = "tool";
  this.cell.id = "ToolbarTextBox_" + this.id;

  var label = document.createElement('span');
  label.innerHTML = this.title;
  YAHOO.util.Dom.addClass(label, 'xGridToolbarTextBoxText');
  this.cell.appendChild(label);

  var textField = document.createElement('input');
  textField.id = this.id;
  textField.setAttribute('type', 'text');

  // Set optional default value.
  if (typeof(o.value) != 'undefined') {
    textField.value = o.value;
  }

  YAHOO.util.Dom.addClass(textField, 'xGridToolbarTextBox');
  this.textInput = textField;

  this.cell.appendChild(textField);

  YAHOO.convio.toolbar.TextBox.prototype.setEnabled = function(isEnabled) {
    this.isEnabled = isEnabled;    	
    this.textInput.disabled = (! isEnabled);
  };

  YAHOO.convio.toolbar.TextBox.prototype.getValue = function() {
    return this.textInput.value;
  };
    
};



YAHOO.convio.toolbar.CheckBox = function(o) {
  if (! o.id ) {
    alert("id is required");
    return;
  }
  if (! o.name ) {
    alert("name is required");
    return;
  }
  if (! o.value) {
    alert("value is required");
    return;		
  }
  if (! o.text) {
    alert("text is required");
    return;		
  }

  this.id = o.id;
  this.name = o.name;
  this.value = o.value;
  this.label = o.text;
	
  this.cell = document.createElement("div");
  this.cell.className = "tool";
  this.cell.id = "ToolbarCheckbox_" + this.id;

  var checked = o.checked === true;
  var html = '<input type="checkbox" id="' + this.id + '" name="' + this.name + '" value="' + this.value + '" ' + (checked ? 'checked ' : '') + '/>';
  html += ' <label for="' + this.id + '">' + this.label + '</label>';
  this.cell.innerHTML = html;

  YAHOO.convio.toolbar.CheckBox.prototype.setEnabled = function(isEnabled) {
    this.isEnabled = isEnabled;
    YAHOO.util.Dom.get(this.id).disabled = (! isEnabled);
  };

  YAHOO.convio.toolbar.CheckBox.prototype.getValue = function() {
    var checkbox = YAHOO.util.Dom.get(this.id);
    return checkbox.checked ? this.value : null;
  };

};
