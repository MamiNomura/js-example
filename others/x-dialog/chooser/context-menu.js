/**
 * @author Michael Pih (mpih@convio.com)
 * @version $Id: context-menu.js,v 1.6 2010/01/04 17:45:34 mpih Exp $
 *
 * Context menus for the chooser dialogs.
 */

YAHOO.namespace("convio.itemchooser");
YAHOO.convio.itemchooser.CmsChooserContextMenu = {

  // The context menu reference.
  contextMenu : null,

  showContextMenuPage: function(url) {
    //This is imperfect, but it should work ok - pops up a new window or tab to the passed-in URL.
    window.open(url); 
  },

  setupContextMenu : function(dataTable, name, divID) {
    var c = YAHOO.convio.itemchooser.CmsChooserContextMenu;
    
    // YUI menuitem objects, with classes
    var status = { text: "Status", classname: "status" };
    var editProperties = { text: "Edit Properties", classname: "edit-properties" };
    var preview = { text: "Preview", classname: "preview" };
    var explore = { text: "Explore", classname: "explore" };
    var exploreFolder = { text: "Explore Folder", classname: "explore-folder" };
    var editBody = { text: "Edit Body", classname: "edit-body" };
    var live = { text: "Live", classname: "live" };
    
    //A YUI context menu is a very simple menu that pops up when the right-button is clicked.
    c.contextMenu = new YAHOO.widget.ContextMenu(name + "contextmenu",
      {
        trigger: dataTable.getTbodyEl(),
        classname: "chooser-context"
      });
    //You can add items to a context menu.  These are the defaults.
    c.contextMenu.addItems([status, editProperties]);
    
      
    var onBeforeShow = function(oType, oArgs, dataTable) {
      //Most of the time (i.e. when there isn't an error in the code somewhere), this method will:
      //1)Clear the choices from the menu
      //2)Get information about the item selected, and add the appropriate choices to the menu
      //3)Render the menu, so it appears on the screen and can be clicked.
      c.contextMenu.clearContent();
      var elRow = c.contextMenu.contextEventTarget;
      elRow = dataTable.getTrEl(elRow);
      var oRecord = dataTable.getRecord(elRow);
      var id = oRecord.getData("ID");
      var isLive = "true" == oRecord.getData("IsLive");
      var isAsset = "true" == oRecord.getData("IsAsset");
      var isFolder = "true" == oRecord.getData("IsFolder");
      
      if (isAsset) {
        if (isLive) {
          c.contextMenu.addItems([status, editProperties, preview, live, exploreFolder])

	    } else {
          c.contextMenu.addItems([status, editProperties, preview, exploreFolder]);
        }
      } else if (isFolder) {
        c.contextMenu.addItems([explore]);
      } else {
        if (isLive) {
          c.contextMenu.addItems([status, editProperties, editBody, preview, live, exploreFolder])
        } else {
          c.contextMenu.addItems([status, editProperties, editBody, preview, exploreFolder]);
        }      
      }
      c.contextMenu.render();
    };
        
    //We want to call "onBeforeShow" before showing the menu.
    c.contextMenu.subscribe("beforeShow", onBeforeShow, dataTable);
       
    //We always want the context menu to be attached to the div passed in to this method.
    c.contextMenu.render(divID);
       
    //If someone clicks a menu item, this method will be called.
    var onContextMenuClick = function(oType, oArgs, dataTable) {
      //We first check what was clicked - what item caused the popup, and which task from the menu.
      var task = oArgs[1];
      var menuItem = task.cfg.getProperty("text");
      if (task) {
        var elRow = this.contextEventTarget;
        elRow = dataTable.getTrEl(elRow);
           
        if (elRow) {
          var oRecord = dataTable.getRecord(elRow);
          var id = oRecord.getData("ID");
          var folderID = oRecord.getData("FolderID");

          //Depending on what was clicked, we popup a new page with some URL:
          if (menuItem == "Status") {
            c.showContextMenuPage("/admin/item/actions/status.jsp?itemID=" + id);
          } else if (menuItem == "Edit Properties") {
            c.showContextMenuPage("/admin/item/actions/properties-edit.jsp?itemID=" + id);
          } else if (menuItem == "Edit Body") {
            c.showContextMenuPage("/admin/item/actions/body-edit.jsp?itemID=" + id);
          } else if (menuItem == "Preview") {
            c.showContextMenuPage("/admin/item/actions/preview.jsp?itemID=" + id);
          } else if (menuItem == "Live") {
            c.showContextMenuPage("/admin/item/actions/live-redirect.jsp?itemID=" + id);
          } else if (menuItem == "Explore Folder") {
            c.showContextMenuPage("/admin/subsite/folders.jsp?folderID=" + folderID);
          } else if (menuItem == "Explore") {
            c.showContextMenuPage("/admin/subsite/folders.jsp?folderID=" + id);
          }
        }
      }       
    }
    //Whenever anything is clicked in a context menu we created, call "onContextMenuClick".
    c.contextMenu.clickEvent.subscribe(onContextMenuClick, dataTable);
  },

  /**
   * Destroys the context menu.
   */
  destroy : function() {
    var th = YAHOO.convio.itemchooser.CmsChooserContextMenu;
    if (th.contextMenu) {
      th.contextMenu.destroy();
      th.contextMenu = null;
    }
  }

}