

YAHOO.namespace("convio.itemchooser");
YAHOO.convio.itemchooser.ChooserUtil = {
  tabView : null,
  browseTab : null,
  searchTab : null,
  recentTab : null,
  outerTabView : null,
  ready : false,
  itemID : null,
  baseType : null, 
  filterID : null,
  showLinks : false,
  ddRow : null,
  rowBeingDragged: null,
  typeID : null,
  
  setupButtons : function(suffix) {
    var u = YAHOO.convio.itemchooser.ChooserUtil;
    //These are the buttons that link to the other pages:
    YAHOO.util.Event.on("browse_button_" + suffix, "click", u.showBrowseTab);
    YAHOO.util.Event.on("search_button_" + suffix, "click", u.showSearchTab);
    YAHOO.util.Event.on("recent_button_" + suffix, "click", u.showRecentTab);
  },
  
  showBrowseTab : function() {
    var u = YAHOO.convio.itemchooser.ChooserUtil;
    u.showTab(0);
  },

  showSearchTab : function() {
    var u = YAHOO.convio.itemchooser.ChooserUtil;
    u.showTab(1);
  },

  showRecentTab : function() {
    var u = YAHOO.convio.itemchooser.ChooserUtil;
    u.showTab(2);
  },
  
  showTab : function(index) {
    var u = YAHOO.convio.itemchooser.ChooserUtil;
    u.tabView.selectTab(index);
  },  
  
  setBaseType : function(newBaseType) {
    YAHOO.convio.itemchooser.ChooserUtil.baseType = newBaseType;
  },
  setItemID : function(newItemID) {  
    YAHOO.convio.itemchooser.ChooserUtil.itemID = newItemID;
  },

  setFilterID : function(filterID) {
    YAHOO.convio.itemchooser.ChooserUtil.filterID = filterID;
  },
  setTypeID : function(typeID) {
	    YAHOO.convio.itemchooser.ChooserUtil.typeID = typeID;
  },
  /**
   * Select the item from the select row of the data table.
   */
  itemSelected : function(oArgs, dataTable) {  
    
    var c = YAHOO.convio.itemchooser.ChooserUtil;
    if (c.showLinks) {
      //Skip all this - it's not how this works.
      return;
    }
    var elTarget = oArgs.target;
    var oRecord = dataTable.getRecord(elTarget);

    var item = {
      url       : oRecord.getData("URL"),
      liveURL   : oRecord.getData("LiveURL"),
      text      : oRecord.getData("Title"),
      id        : oRecord.getData("ID"),
      thumbnail : oRecord.getData("Thumbnail"),
      icon      : oRecord.getData("Icon")
    };

    c.selectItem(item);
  },

  selectCOMLink : function(linkURL, label, altPages) {
    var args = YAHOO.convio.dialog.getArgs();
    var item = {
      url : linkURL,
      liveURL : linkURL,
      text : label,
      isCOMLink : true,
      pages : altPages
    };
    args.returnValue = item;
  },

  /**
   * Selects an item.
   */
  selectItem : function(item) {
    var c = YAHOO.convio.itemchooser.ChooserUtil;

    var args = YAHOO.convio.dialog.getArgs();
    args.returnValue = item;

    // Gotta do the request to image-template-json IF the basetype is "image".
    if (c.baseType == 'image') {     
      //Go ahead and make the call to image-template-json:
      var callback = {
        success: function(o) {
          //Parse the response from JSON into a javascript object
          var response = YAHOO.lang.JSON.parse(o.responseText);
          //Get the ImageTemplate pare of the response:
          var imageTemplate = response["ImageTemplate"];
          args.returnValue.content = imageTemplate["content"];
          args.returnValue.pageletID = imageTemplate["pageletID"];
        },
        failure: function(o) {
          //This should never happen, but if it does, we want to know.
          window.alert("ERROR: FAILED TO GET A RESULT FOR the Item "); 
        }
      };
       if (c.itemID != null) {
    	   var url = "/components/x-dialog/chooser/image-template-retrieve.jsp?itemID=" + c.itemID + "&imageID=" + item.id;
       } else {
    	   var url = "/components/x-dialog/chooser/image-template-retrieve.jsp?&imageID=" + item.id;
       }

      YAHOO.util.Connect.asyncRequest('POST', url, callback);
    }
  },

  thumbnailFormatter : function(elThumbnail, oRecord, oColumn, oData) {
    elThumbnail.innerHTML = "<img src='" + oRecord.getData("Thumbnail") + "'></img>";
  }, 
  
  onRowSelect : function(ev, dataTable) { 
    ev = (ev || window.event);
    var th = YAHOO.convio.itemchooser.ChooserUtil;
	var par = dataTable.getTrEl(Event.getTarget(ev)); //The tr element 
	th.rowBeingDragged = par;
	dataTable.unselectAllRows();
    dataTable.selectRow(par);
	var config = {
  	  centerFrame: true,
  	  resizeFrame : false
  	};
  	th.ddRow = new YAHOO.util.DDProxy(par.id, null, config); 
  	var proxy = document.getElementById(YAHOO.util.DDProxy.dragElId);
  	var oRecord = dataTable.getRecord(par);
  	var linkNode = YAHOO.convio.itemchooser.LinksPanel.createLink(oRecord.getData("ID"), oRecord.getData("Title"), oRecord.getData("Thumbnail"), oRecord.getData("Icon"));
    proxy.innerHTML = linkNode.innerHTML;
  	proxy.style.zIndex ="20000"; //Arbitrarily high number to ensure that it ends up in front of the dialog from the framework.
  	th.ddRow.handleMouseDown(ev.event); 
  	
    if (YAHOO.env.ua.ie > 0) {
      th.ddRow.on("endDragEvent", function(ev) {
        Dom.setStyle(th.rowBeingDragged, 'position', 'static'); 
        Dom.setStyle(th.rowBeingDragged, 'top', '0px'); 
        Dom.setStyle(th.rowBeingDragged, 'left', '0px'); 
        dataTable.render();
      });
    } 
  	
    th.ddRow.onDragDrop = function(ev, id) { 
      var l = YAHOO.convio.itemchooser.LinksPanel;
      if (id == 'SelectedLinks') {
        //Good, dropped on top of the selected links panel.
        var elTarget = ev.target;
        selectedRow = th.rowBeingDragged; 
        var oRecord = dataTable.getRecord(selectedRow);
        if (oRecord && oRecord.getData("Type") != "Folder") {
          //OK, an item, not a folder:
          l.addLink(oRecord.getData("ID"), oRecord.getData("Title"), oRecord.getData("Thumbnail"), oRecord.getData("Icon"));
        }
      }
      dataTable.unselectAllRows(); 
 	  YAHOO.util.DragDropMgr.stopDrag(ev,true); 
      Dom.get(this.getDragEl()).style.visibility = 'hidden'; 
      Dom.setStyle(this.getEl(), 'position', 'static'); 
      Dom.setStyle(this.getEl(), 'top', '0px'); 
      Dom.setStyle(this.getEl(), 'left', '0px'); 
      if (th.ddRow) {
        th.ddRow.unreg();
      }
      th.ddRow = null;
      th.rowBeingDragged = null;
      return false;
     }; 
   }
};


