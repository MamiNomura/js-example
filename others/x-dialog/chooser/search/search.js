/**
 * Context menus for the chooser dialogs.
 */

YAHOO.namespace("convio.itemchooser");
var ICON_BASE = "/system/icons/16x16/";

YAHOO.convio.itemchooser.SearchTab = {
  hostID: null,
  gFolderID: null,

  // Filter date chooser widgets
  dateChoosers: [],

  //Search results are presented in a YUI data table.
  searchResultsDataTable: null,

  //The data table has a data source, which is dynamic.  
  searchResultsTableDataSource: null,

  //There is also a paginator associated with this data table.  It seems to be needed for dynamic data and sorting to work correctly.
  searchResultsTablePaginator: null,	

  //filters is basically a dictionary.  For each key (in [0]), there's a pair of values ([1] and [2]).  
  //The first of each pair is a list of the actual input items in the UI.  
  //The second is the "type" that each of these items will be.  Single means a single value.  Array is typically a select box.  
  //See setupSearchResultsTable (and the request builder) for the algorithm that uses this dictionary.   
  filters: [["keywords",["keywords"],"single"],
            ["fields",["fields"],"array"],
            ["modified",["modifiedStartDate", "modifiedEndDate"],"date"],
            ["published",["publishedStartDate", "publishedEndDate"],"date"],
            ["hostID",["hostID"],"array"],
            ["origin",["origin"], "single"],
            ["typeID",["typeID"],"array"],
            ["mimeType",["mimeType"],"single"],
            ["folderID",["folderID"],"folders"]],
  
  setHostID: function(newHostID) {
    YAHOO.convio.itemchooser.SearchTab.hostID = newHostID;
  },

  isEnabled : function(name) {
    //This check is to find out if a filter (see above) is active for searching
    var innerDiv = document.getElementById(name + "_inner_div");
	return (innerDiv.style.display != "none");       
  },
  //If a filter is of type array, the "_value" HTML entity is a multi-selection list 
  //Thus, we retrieve all the selected values and put them in an array.
  generateValueArray : function(name) {
	  var selObj = document.getElementById(name + "_value");
      var selectedArray = new Array();
      var count = 0;
      for (var i=0; i<selObj.options.length; i++) {
        if (selObj.options[i].selected) {
          selectedArray[count] =selObj.options[i].value;
	      count++;
        }
      }
      return selectedArray;
  },
  //If a filter is of type "folders", then there's a "_container" div, into which
  //a div for each chosen folder is put.  So we need to get these divs, and get the IDs
  //for each.  That makes up the array we return.
  generateFoldersArray : function(name) {
    
	  var folderArray = new Array();

	  var containerDiv = document.getElementById(name + "_container");
	  var folderChildren = containerDiv.childNodes;
      var count = 0;
      for (var i = 0 ; i < folderChildren.length ; i ++) {
        folderArray[count] = folderChildren[i].id;
      	count++;
      }
	  return folderArray;
  },
  
  //This gets and returns the value(s) thyat should be used when filtering the search.
  getSearchTerm : function(name, type) {
    var s = YAHOO.convio.itemchooser.SearchTab;
    
    if (type== "array")  {
      return s.generateValueArray(name);
    } else if (type == "folders") {
      return s.generateFoldersArray(name);
    } else if (type == "date") {
      return this.dateChoosers[name].getValue();
    } else {
      return document.getElementById(name + "_value").value;
    } 
  },

  setupSearchResultsTable: function(params) {
    var s = YAHOO.convio.itemchooser.SearchTab;

    // Initialize the data source.
    var dataSourceURL = "/components/x-dialog/chooser/search/list-retrieve.jsp?";
    var datasource = new YAHOO.util.XHRDataSource(dataSourceURL);
    datasource.responseSchema = {
      resultsList: "SearchResults.items",
      fields: ["Thumbnail", "Modified", "Size", "Title", "FileName", "Type", "Folder", "ID", "LiveURL", "URL", "IsAsset", "IsFolder", "IsLive", "FolderID", "Icon"],
      metaFields: {totalRecords: "SearchResults.resultCount"} 
    };
    datasource.responseType = YAHOO.util.DataSource.TYPE_JSON;
    this.searchResultsTableDataSource = datasource;

    // Initialize the data table.
    var searchResultsColumnDefs = [
      {key:"Thumbnail", label:"", formatter:YAHOO.convio.itemchooser.ChooserUtil.thumbnailFormatter},
      {key:"Title", parser:"string", sortable:true},
      {key:"Folder", parser:"string", sortable:true},
      {key:"FileName", label:"File Name", parser:"string", sortable:true}, 
      {key:"Size", parser:"number", sortable:true}, 
      {key:"Type", parser:"string", sortable:true}, 
      {key:"Modified", parser:"date", sortable:true}
    ];

    // When the search button is clicked OR a header is clicked to change sorting, 
    // the following requestBuilder function is called.  
    // The response is like:  hostID=foo&data2=bar&... 
    var searchRequestBuilder = function(oState, oSelf) {
      oState = oState || {pagination: null, sortedBy: null}; //Not sure what this line does.

      var startIndex = (oState.pagination) ? oState.pagination.recordOffset : 0;
      var results = (oState.pagination) ? oState.pagination.rowsPerPage : 20;
      var sort = (oState.sortedBy) ? oState.sortedBy.key : "FileName";
      var dir = (oState.sortedBy && oState.sortedBy.dir === YAHOO.widget.DataTable.CLASS_DESC) ? "false" : "true";
       
      var params = {}; 

      for (var i=0 ; i< s.filters.length ; i ++) {
        //Get the filter name.                
        var filterName = s.filters[i][0];
        //If this filter is enabled,           
        if (s.isEnabled(filterName)) {
          //Get the array of HTML parameters:
          var realParams = s.filters[i][1];
          //For each HTML parameter associated:
          for (var j=0 ; j<realParams.length; j++) {
            //create an entry in the "params" associative array whose name is the 
            //parameter name, and whose value is the result of calling "getSearchTerm", 
            //defined above.
            params[realParams[j]] = s.getSearchTerm(realParams[j], s.filters[i][2]);
          }
        }
      }
      
      //Now construct the request:
      var count = 0;
      //Start with an empty string of query params
      var queryparams = "";
      for (var i=0 ; i<s.filters.length; i++) {
        //Step through the filters again.
        var filterName = s.filters[i][0];
        var paramArray = s.filters[i][1];
        var type = s.filters[i][2];
        for (var j = 0 ; j < paramArray.length ; j ++) {
          //OK, so we have an array of possible parameters to attach to the query:
          if (params[paramArray[j]]!=undefined) {
            //If there's an actual value, let's add it to the query
            if (count > 0) queryparams += "&";
            count++;
            if ( (type == "array") || (type == "folders") ) {
              //The result is an array of values, not just one value, so for each value, 
              //we have to add another parameter to the query.  Our RequestData class
              //handles this gracefully.
              for (var k = 0 ; k < params[paramArray[j]].length ; k ++) {
                var newparam = "";
                if (k > 0) newparam += "&"
                             newparam += paramArray[j] + "=" + encodeURIComponent(params[paramArray[j]][k]);
                queryparams += newparam;
              }
            } else {
              //Single result
              newparam = paramArray[j] + "=" + encodeURIComponent(params[paramArray[j]]);
              queryparams += newparam;
            }
          } else if (filterName == "hostID") {
            //HostID is not an enabled filter.  We STILL need to filter on the current host anyway.
            if (count > 0) queryparams += "&";
            count++;
            newparam = "hostID=" + s.hostID;
            queryparams += newparam;
          }  
        }
      }
      //After all that, add the pagination and sorting params (and base type if needed)
      queryparams +=  "&pageStart=" + (startIndex + 1) + //We start indexing at 1, not at 0
      "&pageEnd=" + (startIndex + results)+
      "&sortProperty=" + encodeURIComponent(sort) + "&sortAscending=" + dir; 
      if (YAHOO.convio.itemchooser.ChooserUtil.baseType != "") {
        if (count >= 0) {
          queryparams += "&";
        }
        queryparams += "baseType=" + YAHOO.convio.itemchooser.ChooserUtil.baseType;
      }
      return queryparams;
    } 
         
    //YUI pagination setup:
    s.searchResultsTablePaginator = 
    new YAHOO.widget.Paginator({
        alwaysVisible: false,
        containers: 'ItemChooserSearchTabResultsPagination',
        rowsPerPage : 20
      });

    //Configs for the data table.  NOTE: no initial load, but dynamic data.
    var searchResultsTableConfigs = {
      //set up pagination
      paginator : s.searchResultsTablePaginator,
      generateRequest : searchRequestBuilder,
      initialLoad : false,
      dynamicData : true,
      width: "100%",
      height: "344px"
    };
    s.searchResultsDataTable = 
    new YAHOO.widget.ScrollingDataTable("ItemChooserSearchTabResultsDiv", 
                                        searchResultsColumnDefs, 
                                        s.searchResultsTableDataSource,
                                        searchResultsTableConfigs);

    //Enables standard row selection:
    s.searchResultsDataTable.set("selectionMode", "single");
    s.searchResultsDataTable.subscribe("rowClickEvent", s.searchResultsDataTable.onEventSelectRow);
    s.searchResultsDataTable.subscribe("rowClickEvent", YAHOO.convio.itemchooser.ChooserUtil.itemSelected, s.searchResultsDataTable);
    s.searchResultsDataTable.subscribe("rowMousedownEvent", YAHOO.convio.itemchooser.ChooserUtil.onRowSelect, s.searchResultsDataTable);
      
    //YUI magic to get the total # of records for pagination.
    s.handleDataReturnPayload = function(oRequest, oResponse, oPayload) {
      oPayload.totalRecords = oResponse.meta.totalRecords;
      return oPayload;
    };

    //Hook up the search button
    var searchResultsButton = new YAHOO.widget.Button("searchSubmitButton", {label: "Search"});
    searchResultsButton.on("click", s.refreshSearchDataTable);
  
    //Setup for the context menu   
    YAHOO.convio.itemchooser.CmsChooserContextMenu.setupContextMenu(s.searchResultsDataTable, "searchResults", "ItemChooserSearchTabResultsDiv");
  },

  refreshSearchDataTable: function() {
    var s = YAHOO.convio.itemchooser.SearchTab;
    //The changeRequest event is how we get the data table to update itself
    s.searchResultsTablePaginator.fireEvent('changeRequest',s.searchResultsTablePaginator.getState({'page':1}));
  },

  addFolder: function() {
    var s = YAHOO.convio.itemchooser.SearchTab;

    YAHOO.convio.tree.showFolderChooser({
        hostID: s.hostID,
          folderID: s.gFolderID,
          success: function(folder) {
          if (! folder) { return; }


          var div = document.createElement("DIV");
          div.id = folder.id;
          div.innerHTML = 
            '<img src="/system/icons/16x16/folder.gif" align="top">&nbsp;' +
            '<input type="hidden" name="folderID" value="' + folder.id + '" />' +
            '<span style="width:240px">' + folder.breadcrumb + 
            '&nbsp;<img id="removeFolder' + folder.id + '" src="/system/icons/16x16/delete.gif" align="absmiddle" onclick="YAHOO.convio.dialog.getArgs().searchTabClass.removeFolder(' + folder.id + ')" /></span>';

          var folders = document.getElementById("folderID_container");     
          folders.insertBefore(div, folders.lastChild);
        }
      });
  },

  removeFolder: function(folderID) {
    var foldersDiv = document.getElementById("folderID_container");
    var folderChildren = foldersDiv.childNodes;
    for (var i = 0 ; i < folderChildren.length ; i ++) {
      if (folderChildren[i].id == folderID) {
        foldersDiv.removeChild(folderChildren[i]);
        return;
      }
    }
  },

  toggle: function(name) {

    //Toggles simply change divs from "block" to "none" and vice versa
    var img = document.getElementById(name + "_image");
    var innerDiv = document.getElementById(name + "_inner_div");
    if (innerDiv.style.display == "block") {
      innerDiv.style.display = "none";
      img.src = ICON_BASE + "navigate_right.gif";
    } else {
      innerDiv.style.display = "block";
      img.src = ICON_BASE + "navigate_close.gif";
    }
  },
  toggleKeywords: function(e) {
    YAHOO.convio.itemchooser.SearchTab.toggle("keywords");
  },
  toggleFields: function(e) {
    YAHOO.convio.itemchooser.SearchTab.toggle("fields");
  },   
  toggleLastModified: function(e) {
    YAHOO.convio.itemchooser.SearchTab.toggle("modified");
  },
  toggleFirstPublished: function(e) {
    YAHOO.convio.itemchooser.SearchTab.toggle("published");
  },
  toggleWebSite: function(e) {
    YAHOO.convio.itemchooser.SearchTab.toggle("hostID");
  },
  toggleOrigin: function(e) {
    YAHOO.convio.itemchooser.SearchTab.toggle("origin");
  },
  toggleContentTypes: function(e) {
    YAHOO.convio.itemchooser.SearchTab.toggle("typeID");
  },
  toggleMimeType: function(e) {
    YAHOO.convio.itemchooser.SearchTab.toggle("mimeType");
  },
  toggleFolders: function(e) {
    YAHOO.convio.itemchooser.SearchTab.toggle("folderID");
  },
     
     replaceTypes : function(json) {
       var s = YAHOO.convio.itemchooser.SearchTab;
       var response;
       try {
          response = YAHOO.lang.JSON.parse(json.responseText);
       } catch (e) {
          alert("Failed to create new folder.");
          return;
       }
       
       //OK, got here, so let's remove all types:
       s.removeAllTypes(); //This should remove everything except the "Any" type.
       s.addTypes(response.types);
     },
     doHostChange : function(hostID) {
       var s = YAHOO.convio.itemchooser.SearchTab;
       //OK, send out a request to the server for the mime-type information.
       var callback = {
         success: s.replaceTypes
       };
       
       YAHOO.util.Connect.asyncRequest('GET', "/components/x-dialog/chooser/search/host-retrieve.jsp?hostID=" + hostID, callback, null);
       //Also clear the folders.
       s.hostID = hostID;
       s.removeAllFolders(); 
     },
     
     removeAllFolders : function() {
       var folderContainer = document.getElementById("folderID_inner_div");
       var folders = folderContainer.childNodes;
       for (var i = 0; i < folders.length - 1; i++) {
         if (folders[i].nodeType == 3) {
           //Text node, ingnore it.
           continue;
         }
         if (folders[i].id == "folderID_container") {
           var folderChildren = folders[i].childNodes;
           while (folders[i].hasChildNodes()) {
             folders[i].removeChild(folders[i].lastChild);
           }
           return;
         }
       }
     },
     
     removeAllTypes : function() {
       var typeSelect = document.getElementById("typeID_value");
       for (var i = typeSelect.options.length - 1 ; i >= 1; i--) {
         //Don't delete the FIRST one
         typeSelect.remove(i);
       }
     },
     
     addTypes : function (types) {
       var typeSelect = document.getElementById("typeID_value");
       for (var i = 0 ; i < types.length ; i ++) {
         var optn = document.createElement("OPTION");
         optn.text = types[i].label;
         optn.value = types[i].typeID;
         typeSelect.options.add(optn);
       }
  },

  /**
   * Initializes the search tab.
   */
  init: function(hostID, folderID) {
    var Event = YAHOO.util.Event;

    this.hostID = hostID;
    this.gFolderID = folderID;

    // Init date choosers.
    this.dateChoosers["modifiedStartDate"] = new YAHOO.convio.widget.Calendar("modifiedStartDate");
    this.dateChoosers["modifiedEndDate"] = new YAHOO.convio.widget.Calendar("modifiedEndDate");
    this.dateChoosers["publishedStartDate"] = new YAHOO.convio.widget.Calendar("publishedStartDate");
    this.dateChoosers["publishedEndDate"] = new YAHOO.convio.widget.Calendar("publishedEndDate");

    // Init folder chooser.
    Event.on("addFolderIcon", "click", this.addFolder, this, this);
    Event.on("addFolderLink", "click", this.addFolder, this, this);

    // Init filter toggles.
    Event.on("keywords_image", "click", this.toggleKeywords, this, this);
    Event.on("keywords_link", "click", this.toggleKeywords, this, this);
    Event.on("fields_image", "click", this.toggleFields, this, this);
    Event.on("fields_link", "click", this.toggleFields, this, this);
    Event.on("modified_image", "click", this.toggleLastModified, this, this);
    Event.on("modified_link", "click", this.toggleLastModified, this, this);
    Event.on("published_image", "click", this.toggleFirstPublished, this, this);
    Event.on("published_link", "click", this.toggleFirstPublished, this, this);
    Event.on("hostID_image", "click", this.toggleWebSite, this, this);
    Event.on("hostID_link", "click", this.toggleWebSite, this, this);
    Event.on("origin_image", "click", this.toggleOrigin, this, this);
    Event.on("origin_link", "click", this.toggleOrigin, this, this);
    Event.on("typeID_image", "click", this.toggleContentTypes, this, this);
    Event.on("typeID_link", "click", this.toggleContentTypes, this, this);
    Event.on("mimeType_image", "click", this.toggleMimeType, this, this);
    Event.on("mimeType_link", "click", this.toggleMimeType, this, this);
    Event.on("folderID_image", "click", this.toggleFolders, this, this);
    Event.on("folderID_link", "click", this.toggleFolders, this, this);

    // Init search results data table.
    this.setupSearchResultsTable({keywords:''});
  }

}
