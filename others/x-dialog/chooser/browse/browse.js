/**
 * @author Michael Pih (mpih@convio.com)
 * @version $Id: browse.js,v 1.51 2010/10/22 04:59:33 marick Exp $
 *
 * The javascript and YUI code for the Browse Tab of the Chooser dialog
 */

YAHOO.namespace("convio.itemchooser");
YAHOO.convio.itemchooser.BrowseTab = {
  tree : null,
  savedFolderID : null,
  savedSize : 20,
  browseTablePaginator : null,
  selectOnExpand : true,
  safeToSwitchFocus : true,
  newItemMenu : null,
  foldersToExpand : null,
  dataTable : null,
  ddRow : null,
  rowBeingDragged : null,
    
  _setSavedFolderID : function(folderID) {
    YAHOO.log("Setting the saved folder ID to " + folderID);
    var b = YAHOO.convio.itemchooser.BrowseTab;
    b.savedFolderID = folderID;
    if (folderID != null && b.tree != null) {
      YAHOO.log("Highlighting " + folderID);
      //Also, find the folder with this ID and set it selected:
      var node = b.tree.getNodeByProperty('id', folderID);
      if (node != null) {
        //OK, first make sure NOTHING has the class:
        var nodes = YAHOO.util.Dom.getElementsByClassName('selected-tree-node', 'table');
        YAHOO.log("Got nodes: " + nodes.length);
        for (var i = 0 ; i < nodes.length ; i ++) {
          YAHOO.util.Dom.removeClass(nodes[i], 'selected-tree-node');
        }
        var el = node.getEl();
        
        if (el != null) {
          var nodes = YAHOO.util.Dom.getChildren(el); 
          for (var i = 0 ; i < nodes.length ; i ++) {
            if (YAHOO.util.Dom.hasClass(nodes[i], 'ygtvtable')) {
              YAHOO.util.Dom.addClass(nodes[i], 'selected-tree-node');
            }
          }
          YAHOO.log("Highlighted " + folderID);
        }
      }
    }
  },

  _refreshBrowseTable : function() {
    var b = YAHOO.convio.itemchooser.BrowseTab;
    //The changeRequest event is how we get the data table to update itself
	b.browseTablePaginator.fireEvent('changeRequest',b.browseTablePaginator.getState({'page':1}));
  },

  setFolder : function(folderID) {
    YAHOO.log("setting folderID " + folderID);
    var b = YAHOO.convio.itemchooser.BrowseTab;
    if (folderID != b.savedFolderID) {
      YAHOO.log("setting folderID (inner) " + folderID);
      b._setSavedFolderID(folderID);
      b._refreshBrowseTable();
    }
  },

  changeRoot : function() {
    var b = YAHOO.convio.itemchooser.BrowseTab;
    var t = YAHOO.convio.itemchooser.Tree;
	var selector = document.getElementById("subsiteSelector");
	var index = selector.selectedIndex;
	var rootFolderID = selector.options[index].value;
    //refresh the tree:
    t.setupRootNode(b.tree, rootFolderID); 
  },

  changeRootAndSelectFolder : function(folderID) {
    var b = YAHOO.convio.itemchooser.BrowseTab;
    var t = YAHOO.convio.itemchooser.Tree;
   
	var selector = document.getElementById("subsiteSelector");
    var index = selector.selectedIndex;
	var rootFolderID = selector.options[index].value;
	if (rootFolderID != folderID) { 
	  b.selectOnExpand = false;
	} else {
	  b.selectOnExpand = true;
	}
    //refresh the tree:
    t.setupRootNode(b.tree, rootFolderID,  b.setFolder, folderID); 
  },

  changeSizeOfResultsOfBrowseTab : function () {
    var b = YAHOO.convio.itemchooser.BrowseTab;
    var selector = document.getElementById("pageSizeSelector");
    var index = selector.selectedIndex;
    var pageSize = selector.options[index].value;
    if (pageSize != b.savedSize) {
      b.savedSize = pageSize;
      b.browseTablePaginator.setRowsPerPage(pageSize);	
    }
  },

  setupBrowseTree : function(rootFolderID, folderID, foldersToExpand) {
    var b = YAHOO.convio.itemchooser.BrowseTab;
    var t = YAHOO.convio.itemchooser.Tree;
    b.foldersToExpand = foldersToExpand;
    if (b.tree != null) {
      b.tree.destroy();
      b.tree = null;
    }
	
    b.tree = new YAHOO.widget.TreeView("ItemChooserBrowseTabTreeDiv");
    b.tree.setDynamicLoad(t.loadDataForNode);
    b.tree.subscribe("labelClick", function(node) { 
        b.setFolder(node.data.id, false);
      }); 
	       
    b.tree.singleNodeHighlight = true;        
    b.tree.subscribe('clickEvent',b.tree.onEventToggleHighlight);    
    //Now load the root:
    t.setupRootNode(b.tree, rootFolderID, b.setFolder, folderID); 
    
    b.tree.render();	  
	
    //I noticed some not-perfect behavior with respect to expanding nodes and focusing.
    b.tree.subscribe('expandComplete', function(node) {
      if (b.selectOnExpand) {
        b._setSavedFolderID(node.data.id);
        b._refreshBrowseTable();
      } else if (b.foldersToExpand) {
        var folderToExpand = b.foldersToExpand.pop();
        if (b.foldersToExpand.length == 0) {
          b.foldersToExpand = null;
        }
        if (folderToExpand) {
          var treeNode = b.tree.getNodeByProperty("id", folderToExpand);
          treeNode.expand();
        } else {
          b._setSavedFolderID(node.data.id);
          b._refreshBrowseTable();
          b.selectOnExpand = true;
        }
      } else {
        b._setSavedFolderID(b.savedFolderID);
        b._refreshBrowseTable();
        b.selectOnExpand = true;
      }   
    });

    //One special case: if we switch tabs, we need to make sure we don't try to set the focused node
    //Unless we're coming BACK to this tab.  In which case, refocus.
    var c = YAHOO.convio.itemchooser.ChooserUtil;
    c.tabView.subscribe('activeTabChange', function(oArgs) {
        b.safeToSwitchFocus = false;
      });
  },

  itemOrFolderSelected : function(oArgs, dataTable) {
    //Since we're browsing, if someone clicks on a folder OR an item from the 
    //listing part of the browse tab, this method will get called.
    var b = YAHOO.convio.itemchooser.BrowseTab;
	var elTarget = oArgs.target;
    var oRecord = this.getRecord(elTarget);
    //Get the target, then check what type it is.
    if (oRecord.getData("Type") == "Folder") {  
      //If it's a folder, expand that folder in the tree AND in the list and focus on it in the tree.
      b._setSavedFolderID(oRecord.getData("ID"));
	  b._refreshBrowseTable();
	  var treeNode = b.tree.getNodeByProperty("id", oRecord.getData("ID"));
      treeNode.expand();
    } else {
      //If it isn't a folder, it must be an item, so call the standard itemSelected method from ChooserUtil.
      YAHOO.convio.itemchooser.ChooserUtil.itemSelected(oArgs, dataTable);
    }
  },
  setupBrowseTable : function(folderID) {
    //This will be a dynamic table and data source, complete with pagination and sorting.  
    var b = YAHOO.convio.itemchooser.BrowseTab;
	//Save this folder ID for later:
    b.savedFolderID = folderID;
    //Get the page size:
    var selector = document.getElementById("pageSizeSelector");
    var index = selector.selectedIndex;
    var pageSize = selector.options[index].value;
    //Because this is to be dynamic, the dataSourceURL has no parameters.
    var dataSourceURL = "/components/x-dialog/chooser/browse/list-retrieve.jsp?";
    //We can create it as usual, from the URL:
    var tableDataSource = new YAHOO.util.XHRDataSource(dataSourceURL);
    
    //It will need a response Schema that includes:
    //The location of the items in the JSON response, the set of properties, AND a "metaField" which is YUI magic.
    //In this case, the YUI metafield is "totalRecords".
    tableDataSource.responseSchema = {
      resultsList: "FolderContents.items",
      fields: ["URL", "Thumbnail", "Title", "FileName", "Size", "Type", "IsLive", "IsAsset", "IsFolder", "Status", "Modified", "ID", "LiveURL", "FolderID", "Icon"],
      metaFields: {totalRecords: "FolderContents.resultCount"} 
    };
    //Make sure the data source knows to parse the response as JSON.
    tableDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
    // Add the custom formatter to the shortcuts 
    YAHOO.widget.DataTable.Formatter.thumbnailCustom = YAHOO.convio.itemchooser.ChooserUtil.thumbnailFormatter; 

    //These column definitions should be self-explanatory.
    //the formatter is for converting a path to an image to the IMG tag for it (for example) 	 
    var columnDefs = [
      {key:"Thumbnail", label:"&nbsp;", minWidth: 80, formatter:"thumbnailCustom"},
      {key:"Title", parser:"string", sortable:true}, 
      {key:"FileName", parser:"string", sortable:true}, 
      {key:"Size", parser:"number", sortable:true}, 
      {key:"Type", parser:"string", sortable:true}, 
      {key:"Status", parser:"string", sortable:true}, 
      {key:"Modified", parser:"date", sortable:true}
    ]; 

    //OK, so when a different page of results is requested OR a new folder OR the sorting is changed,
    //the following requestBuilder function is called.  
    //The response is like:  hostID=foo&data2=bar&... 
    var myRequestBuilder = function(oState, oSelf) { 
      //If oState is valid (passed in by YUI), use its pagination and sortedBy.  Otherwise, set them to null.
      oState = oState || {pagination : null, sortedBy : null};
      //If the pagination value isn't null, it has a recordOffset (starting at 0)
	  var startIndex = (oState.pagination) ? oState.pagination.recordOffset : 0;
	  //If the pagination value isn't null, it has a rowsPerPage
	  var results = (oState.pagination) ? oState.pagination.rowsPerPage : 20;
	  //If the sortedBy value isn't null, it has a sorting key
	  var sort = (oState.sortedBy) ? oState.sortedBy.key : "Title"; 
	  //This next line is the YUI way of defining Ascending vs. Descending
	  var dir = (oState.sortedBy && oState.sortedBy.dir === YAHOO.widget.DataTable.CLASS_DESC) ? "false" : "true";
      //We saved the current folder before.
      var folderID = b.savedFolderID;
      //So create the query string.  This is appended to the table data source's URL above.
      var params = "folderID=" + folderID + 
	               "&pageStart=" + (startIndex + 1) + //We start indexing at 1, not at 0
	               "&pageEnd=" + (startIndex + results) +
	               "&sortProperty=" + encodeURIComponent(sort) + "&sortAscending=" + dir; 
      if (YAHOO.convio.itemchooser.ChooserUtil.baseType != "") {
        //And if we have a BASE type (image chooser does, other uses for this, might not), use it.
        params += "&baseType=" + YAHOO.convio.itemchooser.ChooserUtil.baseType;
      }
      if (YAHOO.convio.itemchooser.ChooserUtil.filterID != null) {
        //Perhaps a filter ID was passed in:
        params += "&filterID=" + YAHOO.convio.itemchooser.ChooserUtil.filterID;
      }
      if (YAHOO.convio.itemchooser.ChooserUtil.typeID != null) {
          params += "&typeID=" + YAHOO.convio.itemchooser.ChooserUtil.typeID;
      }

      return params;
    };
                             
    //Need an initial request:
    var myInitialRequest = "folderID=" + b.savedFolderID + 
                           "&pageStart=1&pageEnd=" + pageSize;
    if (YAHOO.convio.itemchooser.ChooserUtil.baseType != "") {
      myInitialRequest += "&baseType=" + YAHOO.convio.itemchooser.ChooserUtil.baseType;
    }  
    
    if (YAHOO.convio.itemchooser.ChooserUtil.filterID != null) {
      myInitialRequest += "&filterID=" + YAHOO.convio.itemchooser.ChooserUtil.filterID;
    }
    if (YAHOO.convio.itemchooser.ChooserUtil.typeID != null) {
        myInitialRequest += "&typeID=" + YAHOO.convio.itemchooser.ChooserUtil.typeID;
    }
    
    //Configs has:
    //1)Pagination - this tells YUI where to put the paginator.  It knows how to handle it.
    //2)dynamicData : true tells YUI this is dynamic.
    //3)generateRequest : myRequestBuilder tells YUI how to generate a request when needed.
    //4)initialRequest: myInitialRequest tells YUI what request to make right at the beginning when the table is shown.
    b.browseTablePaginator = 
      new YAHOO.widget.Paginator({
        rowsPerPage : pageSize,
        containers: 'pageLinks',
        alwaysVisible: false,
        pageLinks: 5
      });
     
    var configs = {
      //set up pagination
      paginator : b.browseTablePaginator,
      dynamicData : true,
      generateRequest : myRequestBuilder,
      initialRequest: myInitialRequest,
      width: "100%",
      height: "334px",
      rowSingleSelect: true
    };
 
    //Construct the data table:                       
    var dataTable = new YAHOO.widget.ScrollingDataTable("ItemChooserBrowseTabTableDiv", columnDefs, tableDataSource, configs);
    YAHOO.convio.itemchooser.BrowseTab.dataTable = dataTable;
    //Enables standard row selection:
    dataTable.set("selectionMode", "single");
    //We want to select a row when it's clicked but we ALSO want to make sure the appropriate item or folder is selected.
    dataTable.subscribe("rowClickEvent", dataTable.onEventSelectRow);
    dataTable.subscribe("rowClickEvent", b.itemOrFolderSelected, dataTable);
    dataTable.subscribe("dataReturnEvent", function(node) {
      YAHOO.convio.dialog._getDialog().center();
    });
    
    //This is YUI magic that is needed to make pagination work.  We defined the 
    //metafield "totalRecords" before.  This puts the value in a place where YUI can access it.
    dataTable.handleDataReturnPayload = function (oRequest, oResponse, oPayload) {
       oPayload.totalRecords = oResponse.meta.totalRecords;
       return oPayload;
    };  
      
    //And finally, setup the context menu.  
    YAHOO.convio.itemchooser.CmsChooserContextMenu.setupContextMenu(dataTable, "Browse", "ItemChooserBrowseTabTableDiv"); 

    b.newItemMenu = new YAHOO.widget.Menu("add-file-menu", {
        context : ["add-file", "tl", "bl"], 
        classname : "itemChooserNewItemMenu"
      });
    
    // Add events to add-file and add-folder buttons
    YAHOO.util.Event.addListener("add-file", 'click', b.showNewItemMenu);
    YAHOO.util.Event.addListener("add-folder", 'click', b.showNewSubfolderDialog);
    b.dataTable.subscribe("rowMousedownEvent", YAHOO.convio.itemchooser.ChooserUtil.onRowSelect, b.dataTable);
  },
  
  /**
   * On-click handler for the "New Item" button.
   * Renders the menu options for creating a new content item.
   */
  showNewItemMenu : function() {
    var th = YAHOO.convio.itemchooser.BrowseTab;
    var m = th.newItemMenu;
    var folderID = th.savedFolderID;
    
    
    var url =  "/components/x-dialog/chooser/browse/folder-types-retrieve.jsp";
    url += "?folderID=" + folderID;
    if (YAHOO.convio.itemchooser.ChooserUtil.baseType) {
      url += "&baseType=" + escape(YAHOO.convio.itemchooser.ChooserUtil.baseType);
    }
    
    var callback = {
      success : function(o) {
        try {
          var response = YAHOO.lang.JSON.parse(o.responseText);
        } catch (e) {
          alert("Failed to fetch content types for folder.");
          return;
        }

        m.clearContent();

        if (response.status == "error") {
          // Friendly error.

          var msg = null;
          switch (response.errorCode) {
          case 'no_types':
          case 'permission_denied':
            msg = "Access Denied";
          default:
            YAHOO.convio.dialog.showError({detail : response.errorMessage, showDetail : false});
          }

          return;
        }
        
        if (response.types.length == 1) {
          // Only one CCT is mapped to this folder. No need for a menu.
       
          th.showNewItemDialog("click", th, response.types[0].id);

        } else if (response.types.length > 1) {
          // At least one CCT is mapped to this folder. Provide a menu.
          
          for (var i=0; i<response.types.length; i++) {
            var type = response.types[i];

            var newItemLabel = "<img src=\"" + type.icon + "\"/> New " + type.label + "...";

            m.addItem({
                text : newItemLabel,
                  onclick : {
                  fn : th.showNewItemDialog,
                    obj : type.id,
                    scope : th
                    }
              });
          }
        }
        
        m.render();
        m.show();
      },

      cache : false
    };

    YAHOO.util.Connect.asyncRequest('GET', url, callback);
  },

  /**
   * Open the new content item dialog.
   *
   * @param typeID The extended content type ID
   */
  showNewItemDialog : function(type, context, args) {
    var typeID = args;

    var th = YAHOO.convio.itemchooser.BrowseTab;

    YAHOO.convio.item.showNewItemDialog(th.savedFolderID, typeID, function(item) {
      // Execute the following function on the parent dialog.
      YAHOO.convio.dialog.addPostProcessListener(function() {
          if (YAHOO.convio.itemchooser.ChooserUtil.showLinks) {
            //Add the link:
             YAHOO.convio.itemchooser.LinksPanel.addLink(item.id, item.text, item.thumbnail, item.icon);
          } else {
            YAHOO.convio.itemchooser.ChooserUtil.selectItem(item);
            YAHOO.convio.dialog.submit();
          }
        });
    });
  },

  selectNewFolder: function(oArgs) {
    window.alert("Selecting folder " + oArgs.folderID);
  }, 
  
  showNewSubfolderDialog : function() {
    var th = YAHOO.convio.itemchooser.BrowseTab;
    var url = "/components/x-dialog/newfolder/folder-new-dialog.jsp";
    url += "?parentID=" + th.savedFolderID;
    
    var configuration = {
      authenticate : true,
      process : function(o) {
        try {
          var response = YAHOO.lang.JSON.parse(o.responseText);
        } catch (e) {
          alert("Failed to create new folder.");
          return;
        }

        if (response.error) {
          if (response.error == "duplicatename") {
            alert("The URL name \"" + response.systemName + "\" is taken.  Please re-open the 'Add Folder' dialog and choose another name.");
	        return;
	      } else if (response.error == "duplicatetitle") {
	        alert("The title \"" + response.title + "\" is taken.  Please re-open the 'Add Folder' dialog and choose another title.");
	        return;
	      } else if (response.error == "duplicatealias") {
	        alert("The URL name \"" + response.systemName + "\" is taken by an alias.  Please re-open the 'Add Folder' dialog and choose another name.");
	        return;
	      } else if (response.error == "reservedname") {
	        alert("The URL name \"" + response.systemName + "\" is reserved for system use.  Please re-open the 'Add Folder' dialog and choose another name.");
	        return;
	      } else {
            // An error occurred trying to create the new subfolder.
            YAHOO.convio.dialog.showError({msg : "An error occurred", detail : response.error});
            return;
          }
        }

        var b = YAHOO.convio.itemchooser.BrowseTab;
        b.changeRootAndSelectFolder(response.id, response.parentID);
      },
      argument : {browseTabClass : YAHOO.convio.itemchooser.BrowseTab}
    };
    YAHOO.convio.dialog.open(url, configuration);
  },
  
  /**
   * Destroys any content and state associated with the browse tab.
   */
  destroy : function() {
    var th = YAHOO.convio.itemchooser.BrowseTab;

    if (th.newItemMenu) {
      th.newItemMenu.destroy();
      th.newItemMenu = null;
    }

    if (th.tree) {
      th.tree.destroy();
      th.tree = null;
    }
  }
}
