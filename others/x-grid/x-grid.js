/**
 * $Source: /home/cvs/cvsroot/cms/integration/web/components/x-grid/x-grid.js,v $
 * $Author: mami $
 * $Revision: 1.63 $
 * $Date: 2011/04/18 21:09:22 $
 *
 * X-browser data table methods.
 **/

YAHOO.namespace("convio.datatable");
YAHOO.convio.datatable = {

  /**
   * Utility function for datatable.generateRequest.
   */
  generateRequest: function(oState, oSelf) {
    var sort, dir, startIndex, results;
    oState = oState || {pagination:null, sortedBy:null};
    startIndex = (oState.pagination) ? oState.pagination.recordOffset : (oState.recordOffset ? oState.recordOffset: 0);
    results = (oState.pagination) ? oState.pagination.rowsPerPage : (oState.rowsPerPage ? oState.rowsPerPage : null);
    sort = (oState.sortedBy) ? oState.sortedBy.key : null;
    dir = (oState.sortedBy) ? ((oState.sortedBy.dir == YAHOO.widget.DataTable.CLASS_ASC) ? 'asc' : 'desc') : 'asc';

    var request = '';
    if (results !== null) {
      request += '&results=' + encodeURIComponent(results);
    }
    if (startIndex !== null) {
      request += '&startIndex=' + encodeURIComponent(startIndex);
    }
    if (sort !== null) {
      request += '&sort=' + encodeURIComponent(sort);
    }
    if (dir !== null) {
      request += '&dir=' + encodeURIComponent(dir);
    }
    request += '&';

    return request;
  },

  /**
   * Built-in Context Menus
   */

  /**
   * Displays an item context menu.
   *
   * @param m The context menu
   * @param id The item ID
   */
  showItemContextMenu: function(m, id) {
    if (id === null || typeof(id) != "number") {
      alert("Failed to load item context menu: invalid ID=" + id);
      return;
    }

    var url = "/components/x-grid/item-menu-info.jsp?itemID=" + id;
    var callback = {
      success: function(o) {
        var response = null;
        try {
          response = YAHOO.lang.JSON.parse(o.responseText);
        } catch (e) {
          alert("Failed to load item context menu items.");
          return;
        }

        m.addItems(response.itemdata);
        m.render();
      },
      failure: function(o) {
        alert("Failed to render context menu for id=" + id);
      },
      cache: false,
      timeout: 10000
    };
    YAHOO.convio.authenticator.connect('POST', url, callback);
  },

  /**
   * Displays a folder context menu.
   *
   * @param m The context menu
   * @param id The folder ID
   */
  showFolderContextMenu: function(m, id) {
    if (id === null || typeof(id) != "number") {
      alert("Failed to load item context menu: invalid ID=" + id);
      return;
    }

    m.addItem({
      id: "folderContextMenu-" + id + "-explore",
      classname: "folderContextMenu-explore",
      text: "Explore Folder", 
      url: "/admin/subsite/folders.jsp?folderID=" + id
    });
  },

  /**
   * Formatters
   */

  /**
   * Default formatter for date/time.
   */
  formatDateTime: function(elCell, oRecord, oColumn, oData) {
    if (oData) {
      var dateFormat = "%b %d, %Y %l:%M%P %Z"; // e.g., "Apr 28, 2009 10:57am CDT"
      var oDate = new Date(oData);
      elCell.innerHTML = YAHOO.util.Date.format(oDate, {format:dateFormat});
    }
  },

  /**
   * Default formatter for a boolean.
   */
  formatBoolean: function(elCell, oRecord, oColumn, oData) {
    var isTrue = (oData === true || oData === "true");
    YAHOO.util.Dom.addClass(elCell, (isTrue ? 'boolean-true' : 'boolean-false'));
    elCell.innerHTML = (isTrue ? 'Yes' : 'No');
  },

  /**
   * Default formatter for website.
   *
   * @param oData { id, name }
   */
  formatWebsite: function(elCell, oRecord, oColumn, oData) {
    oData = oData || {};

    var id = oData.id;
    var name = oData.name;
    if (id === null || name === null) {
      alert("formatWebsite: id and name are required");
      return;
    }
    elCell.innerHTML = '<a target="_top" href="/admin/portal/portal.jsp?hostID=' + encodeURIComponent(id) + '">' + name + '</a>';
  },

  /**
   * Default formatter for folder.
   *
   * @param oData { id, title }
   */
  formatFolder: function(elCell, oRecord, oColumn, oData) {
    oData = oData || {};

    var id = oData.id;
    var title = oData.title;
    if (id === null || title === null) {
      alert("formatFolder: id and title are required");
      return;
    }
      elCell.innerHTML = '<img align="absmiddle" width="16" height="16" src="/assets/icons/16x16/folder.gif" border="0" /> <a target="_top" href="/admin/subsite/folders.jsp?folderID=' + encodeURIComponent(id) + '">' + title + '</a>';
  },

  /**
   * Default formatter for user.
   *
   * @param oData {name, email}
   */
  formatUser: function(elCell, oRecord, oColumn, oData) {
    oData = oData || {};

    var name = oData.name;

    if (name === null) {
      alert("formatUser: name is required");
      return;
    }

    var link;
    if (name == "none none") {
      // Anonymous user.
      link = "Anonymous";
    } else if (oData.email && (oData.email != 'none' && oData.email != 'devnull@convio.com')) {
      link = '<a href="mailto:' + oData.email + '">' + oData.name + '</a>';
    } else {
      link = oData.name;
    }

    elCell.innerHTML = '<img align="absmiddle" width="16" height="16" border="0" src="/system/icons/16x16/user1.gif" /> <span>' + link + '</span>';
  }

};


/**
 * Create a GridView object.
 * See http://twiki.corp.convio.com/twiki/bin/view/Engineering/CmsUiDataTable for documentation.
 *
 * @param config
 * @return the GridView object
 */
YAHOO.convio.datatable.GridView = function(cfg) {

  this.dataSource;
  this.dataTable;
  this.paginator;
  this.contextMenu;

  this.toolbar;
  this.initToolbar;
  this.updateToolbar;

  this.isRendered = false;
  this._initialRender = true;

  // maintains state of previous selection
  var _previousSelection = [];

  // Sanity check required configuration.
  this.config = _initConfig(cfg);
  this.id = this.config.id;

  // Render the gridview on DOM ready.
  var th = this;
  if (YAHOO.convio.dialog.getID() == null) {
    YAHOO.util.Event.onDOMReady(function() { th.render(); });
  }

  /**
   * Sanity check required configuration. Also sets default config values.
   */
  function _initConfig(cfg) {
    cfg = cfg || {};

    if (! cfg.id) {
      alert("id is required");
      return;
    }

    if (! cfg.url) {
      alert("data url is required");
      return;
    }

    if (! cfg.columns || ! cfg.columns.length) {
      alert("data columns are required");
      return;
    }

    // cfg.fields represents the data source values.
    // If not specified, fields will default to the cfg.columns spec,
    // plus any additional cfg.metaFields fields.
    if (! cfg.fields || ! cfg.fields.length) {
      // If fields are not specified, derive fields from columns.
      cfg.fields = [];
      for (var i=0; i<cfg.columns.length; i++) {
        cfg.fields[i] = cfg.columns[i];
      }

      if (cfg.metaFields && cfg.metaFields.length) {
        var len = cfg.fields.length;
        for (var i=0; i<cfg.metaFields.length; i++) {
          cfg.fields[len+i] = cfg.metaFields[i];
        }
      }
    }

    var firstField = cfg.fields[0];
    var firstFieldKey = (typeof(firstField) == 'string') ? firstField : firstField.key;
    cfg.sortedBy = cfg.sortedBy || {key:firstFieldKey, dir:YAHOO.widget.DataTable.CLASS_ASC};
    cfg.selectionMode = cfg.selectionMode || null;
    if (cfg.selectionMode == "multiple") {
      cfg.selectionMode = "standard"; // multiple is equivalent to standard
    }

    // Default paginator settings.
    cfg.pageSize = cfg.pageSize || 20;
    if (! cfg.pageSizeOptions || ! cfg.pageSizeOptions.length) {
      cfg.pageSizeOptions = [20,50,100];
    }

    cfg.dynamicData = (typeof(cfg.dynamicData) == 'undefined');

    cfg.width = cfg.width || "100%";
    if (typeof(cfg.width) == 'number') {
      cfg.width = String(cfg.width) + 'px';
    }

    cfg.height = cfg.height || "480px";
    if (typeof(cfg.height) == 'number') {
      cfg.height = String(cfg.height) + 'px';
    }

    cfg.MSG_EMPTY = cfg.MSG_EMPTY || YAHOO.widget.DataTable.MSG_EMPTY;
    
    if (cfg.initialLoad !== false) { cfg.initialLoad = true; }
    
    if (!cfg.paginatorTemplate) {
      cfg.paginatorTemplate = '<div class="currentPageReport">{CurrentPageReport}</div><div class="pageLinks">{FirstPageLink} {PreviousPageLink} {PageLinks} {NextPageLink} {LastPageLink}</div><div class="pageSizeChooser">Results per page: {RowsPerPageDropdown}</div>';
    }
    
    return cfg;
  };

  /**
   * Transforms:
   * <div id="foo"></div> 
   *
   * into:
   * <div id="foo">
   *   <div id="fooTitleStatusBarWrap">
   *     <h2 id="fooTitleBar"></h2>
   *     <div id="fooStatusBarWrap">
   *       <span id="fooStatusBar"></span>
   *     </div>
   *   </div>
   *   <div id="fooToolbarContainer"></div>
   *   <div id="fooDataTable"></div>
   *   <div id="fooPaginator"></div>
   * </div>
   */
  this._makeContainer = function() {
    var container = YAHOO.util.Dom.get(this.id);
    if (container === null) {
      alert("Invalid node ID: " + this.id);
      return;
    }

    YAHOO.util.Dom.addClass(container, 'xGrid');
    
    if (this.config.title) {
      var titleStatusBarWrap = document.createElement('div');
      titleStatusBarWrap.id = this.id + "TitleStatusBarWrap";
      YAHOO.util.Dom.addClass(titleStatusBarWrap, 'titleStatusBarWrap clearfix');
      container.appendChild(titleStatusBarWrap);

      var titleBar = document.createElement('h2');
      titleBar.id = this.id + 'TitleBar';
      YAHOO.util.Dom.addClass(titleBar, 'titleBar');
      if (this.config.title) {
        titleBar.innerHTML = this.config.title;
      }
      titleStatusBarWrap.appendChild(titleBar);

      var statusBarWrap = document.createElement('div');
      statusBarWrap.id = this.id + 'StatusBarWrap';
      YAHOO.util.Dom.addClass(statusBarWrap, 'statusBarWrap');
      var statusBar = document.createElement('span');
      statusBar.id = this.id + 'StatusBar';
      YAHOO.util.Dom.addClass(statusBar, 'statusBar');
      titleStatusBarWrap.appendChild(statusBarWrap);
      statusBarWrap.appendChild(statusBar);
    }

    if (this.initToolbar) {
      var toolbarContainerID = this.id + 'ToolbarContainer';
      var toolbarContainer = document.getElementById(toolbarContainerID) 
      if (toolbarContainer == null) {
        toolbarContainer = document.createElement('div');
        toolbarContainer.id = toolbarContainerID;
        container.appendChild(toolbarContainer);
      }
      YAHOO.util.Dom.addClass(toolbarContainer, 'xGridToolbar clearfix');
    }

    var tableContainer = document.createElement('div');
    tableContainer.id = this.id + 'DataTable';
    container.appendChild(tableContainer);

    if (this.config.dynamicData === true) {
      var paginatorContainer;
      if (!document.getElementById(this.id + 'PaginatorContainer')) {  
        paginatorContainer = document.createElement('div');
        paginatorContainer.id = this.id + 'PaginatorContainer';
        YAHOO.util.Dom.addClass(paginatorContainer, 'paginatorContainer clearfix');
        container.appendChild(paginatorContainer);
      }
    }

    return container;
  };

  /**
   * Creates the data table.
   */
  this._newDataTable = function() {
    // Initialize the data source.
    this._initDataSource();

    // Initialize the paginator.
    this._initPaginator();

    // Intialize the table config.
    var tConfig = {
      initialLoad : this.config.initialLoad,
      initialRequest: this.config.query,
      selectionMode: this.config.selectionMode,
      dynamicData: this.config.dynamicData,     // Enables server-side sorting and pagination
      sortedBy: this.config.sortedBy,           // Sets UI initial sort arrow
      paginator: this.paginator,              // Enables pagination
      height: this.config.height,
      width: this.config.width,
      MSG_EMPTY: this.config.MSG_EMPTY,
      rowExpansionTable : this.config.rowExpansionTable,  // table will be row expansion
      rowExpansionTemplate : this.config.rowExpansionTemplate  // expansion template      
    };

    this.generateRequest = this.generateRequest || this.config.generateRequest || null;
    if (this.generateRequest) {
      tConfig.generateRequest = this.generateRequest;
    }

    if (this.config.initialLoad === false) {
      tConfig.initialLoad = false;
    }
	if (this.config.rowExpansionTable) {
		var dataTable = new YAHOO.widget.RowExpansionDataTable(this.id + "DataTable", 
                                                        this.config.columns, 
                                                        this.dataSource, 
                                                        tConfig);
                                                               
       dataTable.subscribe( 'cellClickEvent', function( o ){
			dataTable.onEventToggleRowExpansion( o );
			YAHOO.util.Dom.addClass( o.target, 'spinner' );
		} );
		
	} else {
    	var dataTable = new YAHOO.widget.ScrollingDataTable(this.id + "DataTable", 
                                                        this.config.columns, 
                                                        this.dataSource, 
                                                        tConfig);
    
    // Update totalRecords on the fly with value from server 
    dataTable.handleDataReturnPayload = function(oRequest, oResponse, oPayload) {
      oPayload = oPayload || {};
      if (! isNaN(oResponse.meta.totalRecords)) {
        oPayload.totalRecords = oResponse.meta.totalRecords;
      }

      return oPayload;
    }

    // Initialize row selection model. Options are 'none', 'single', 'standard' (multiple).
    // Use 'none' for adding custom selection models. 
    dataTable.subscribe("rowMouseoverEvent", dataTable.onEventHighlightRow);
    dataTable.subscribe("rowMouseoutEvent", dataTable.onEventUnhighlightRow);

    if (this.config.selectionMode == 'standard' || this.config.selectionMode == 'single') {
      dataTable.subscribe("rowClickEvent", dataTable.onEventSelectRow);
      dataTable.subscribe("rowSelectEvent", dataTable.clearTextSelection);
      dataTable.subscribe("rowUnselectEvent", dataTable.clearTextSelection);
    }

    dataTable.subscribe("rowClickEvent", this._selectionChanged, dataTable, this);
    dataTable.subscribe("theadRowClickEvent", this._selectionChanged, dataTable, this);
    dataTable.subscribe("tableBlurEvent", this._selectionChanged, dataTable, this);
    }
    
    // Recenter the dialog after the gridview contents are rendered for the first time.
    dataTable.subscribe("postRenderEvent", function() {
        // If gridview is within the dialog, recenter the dialog after re-rendering
        // the gridview.
        if (this._initialRender) {
          YAHOO.convio.dialog.center();
          this._initialRender = false;
        }
      }, dataTable, this);

    
    // Auto-resize data table to the current page size.
    YAHOO.util.Event.on(window, 'resize', this.resize, null, this);

    this.dataTable = dataTable;
  };

  /**
   * Initializes the data source.
   */
  this._initDataSource = function() {
    var dataSource = new YAHOO.util.DataSource(this.config.url);
    dataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
    dataSource.connXhrMode = "queueRequests";
    dataSource.responseSchema = {
      resultsList: "records",
      fields: this.config.fields,
      metaFields: {totalRecords: "totalRecords"}
    };
    this.dataSource = dataSource;
  };

  /**
   * Initializes the paginator.
   */
  this._initPaginator = function() {
    var paginator = this.config.paginator;
    if (! paginator && this.config.dynamicData === true) {
      paginator = new YAHOO.widget.Paginator({
        rowsPerPage: this.config.pageSize,
        containers: this.id + 'PaginatorContainer',
        template: this.config.paginatorTemplate,
        rowsPerPageOptions: this.config.pageSizeOptions,
        pageLinks: 5,
        alwaysVisible: true,
        pageLabelBuilder: function(page, paginator) {
          var recs = paginator.getPageRecords(page);
          return (recs[0]+1) + ' - ' + (recs[1]+1);
        },
        pageReportTemplate: 'Showing <strong>{startRecord} - {endRecord}</strong> of <strong>{totalRecords}</strong> records'
      });
    }

    this.paginator = paginator;
  };

  /**
   * Initializes the context menu.
   */
  this._initContextMenu = function() {
    var contextMenu = null;

    this.onContextMenu = this.onContextMenu || this.config.onContextMenu || null;

    var th = this;

    // Initialize context menus. Defining a onContextMenu listener enables context menus.
    if (this.onContextMenu) {
      // Dynamically generate the context menu on each row click by firing the 
      // onContextMenu(conextMenu, selectedRow).
      contextMenu = new YAHOO.widget.ContextMenu(this.id + "ContextMenu",
                                                     {trigger:this.dataTable.getTbodyEl()});
      contextMenu.subscribe("beforeShow", function(p_sType, p_aArgs) {
          var elRow = this.contextEventTarget;
          elRow = th.dataTable.getTrEl(elRow);
          if (! elRow) {
            contextMenu.clear();
          } else {

            // Make sure that the selection follows the context click.
            if (th.config.selectionMode == 'standard' || th.config.selectionMode == 'single') {
              th.dataTable.unselectAllRows();
              th.dataTable.selectRow(elRow);
              th._selectionChanged('contextMenuClickEvent', th.dataTable);
            }

            var record = th.dataTable.getRecord(elRow);
            contextMenu.clearContent();
            if (th.config.onContextMenu == "item") {
              // Use the standard item context menu.
              var id = record.getData("id");
              YAHOO.convio.datatable.showItemContextMenu(contextMenu, id);
            } else if (th.config.onContextMenu == "folder") {
              var id = record.getData("id");
              YAHOO.convio.datatable.showFolderContextMenu(contextMenu, id);
            } else {
              // Use a custom function for the context menu.
              th.onContextMenu(contextMenu, record);
            }
            contextMenu.render(th.id);
          }
        });
      contextMenu.render(this.id);
    }

    this.contextMenu = contextMenu;
  };

  /**
   * Renders the grid view.
   */
  this.render = function() {
    if (this.isRendered) {
      return;
    }

    this._makeContainer();

    // Render toolbar.
    if (this.initToolbar) {
      this.toolbar = new YAHOO.convio.datatable.Toolbar(this.id + "ToolbarContainer");
      this.initToolbar(this.toolbar);
    }

    // Create the data table.
    this._newDataTable();

    // Update the toolbar.
    if (this.toolbar && this.updateToolbar) {
      this.updateToolbar(this.toolbar);

      // Register listener for custom row selection change event.
      if (this.config.selectionMode == 'standard' || this.config.selectionMode == 'single') {
        this.dataTable.subscribe("rowSelectionChangeEvent", function(t,o) {
            this.updateToolbar(this.toolbar, o);
          }, this.dataTable, this);
      }
    }

    // Initialize the context menu.
    this._initContextMenu();

    this.resize();

    this.isRendered = true;
  };  

  /**
   * Fetches the selected record. If more than one record is selected, returns null
   *
   * @return The selected record, possibly null
   */
  YAHOO.convio.datatable.GridView.prototype.getSelectedRecord = function() {
    var rows = this.dataTable.getSelectedRows();
    if (rows.length !== 1) {
      return null;
    }
    return this.dataTable.getRecord(rows[0]);
  };

  /**
   * Determines whether any records/rows are selected.
   *
   * @return true if at least one record is selected, otherwise false
   */
  YAHOO.convio.datatable.GridView.prototype.hasSelection = function() {
    var rows = this.dataTable.getSelectedRows();
    return (rows.length > 0);
  };

  /**
   * Fetches the selected records.
   *
   * @return An array of selected records, possibly empty
   */
  YAHOO.convio.datatable.GridView.prototype.getSelectedRecords = function() {
    var rows = this.dataTable.getSelectedRows();

    var records = [];
    for (var i in rows) {
      var rec = this.dataTable.getRecord(rows[i]);
      records.push(rec);
    }

    return records;
  };

  /**
   * Fetches the current page size.
   */
  YAHOO.convio.datatable.GridView.prototype.getPageSize = function() {
    return (this.paginator ? this.paginator.getState().rowsPerPage : null);
  };

  /**
   * Refreshes a data table by ID. If no ID is specified, refreshes all 
   * registered data tables.
   */
  YAHOO.convio.datatable.GridView.prototype.refresh = function() {
    var th = this;
    th.dataTable.getDataSource().sendRequest('', {
        success: function(oRequest, oParsedResponse, oPayload) {
          th.dataTable.onDataReturnInitializeTable(oRequest, oParsedResponse, oPayload);
          th._selectionChanged('dataTableRefresh', th.dataTable);
        },
        scope: th.dataTable
      });

      // Clear the status.
    this.setStatus(null);
  };

  /**
   * Asynchronous call that refreshes the data table upon success.
   *
   * @param url The target of the asynchronous call
   * @param msg The status message
   */
  YAHOO.convio.datatable.GridView.prototype.connect = function(url, msg, query) {
    var th = this;
    // keep paginator information the same as before
    if (query == undefined && this.generateRequest) {
    	query = this.generateRequest(this.paginator.getState());
    }
    var callback = {
      success: function(o) {

        var response = null;
        try {
          response = YAHOO.lang.JSON.parse(o.responseText);
          if (response.status == 'error') {
            YAHOO.convio.dialog.showError({detail:response.errorMessage});
            return;
          }
        } catch (e) {
          // Ignore. Treat as success.
        }

        if (query) {
          th.sendRequest(query);
        } else {
          th.refresh();
        }
        th.setStatus(msg);
      },
      failure: function(o) {
        YAHOO.convio.dialog.showError({detail : o.responseText}); 
      },
      timeout: 10000,
      cache: false
    };
    YAHOO.convio.authenticator.connect('POST', url, callback);
  };

  /**
   * Opens an x-dialog and refreshes the data table upon success.
   *
   * @param url The dialog URL
   * @param msg The status message
   * @param query datatable query 
   */
  YAHOO.convio.datatable.GridView.prototype.open = function(url, msg, query) {
    var th = this;
    // keep paginator information the same as before
    if (query == undefined && this.generateRequest) {
      query = this.generateRequest(this.paginator.getState());
    }
    var listeners = {
      process: function(o) {

        var response = null;
        try {
          response = YAHOO.lang.JSON.parse(o.responseText);
          if (response.status == 'error') {
            YAHOO.convio.dialog.showAlert({msg:response.errorMessage});
            return;
          }
        } catch (e) {
          // Ignore. Treat as success.
        }

        if (query) {
          th.sendRequest(query);
        } else {
          th.refresh();
        }        
        th.setStatus(msg);
      },
      authenticate: true
    };
    YAHOO.convio.dialog.open(url, listeners);
  };

  /**
   * Sends a new request to update data table contents.
   *
   * @param query The data table query
   */
  YAHOO.convio.datatable.GridView.prototype.sendRequest = function(query) {
    this.dataTable.getDataSource().sendRequest(query,
      {success:this.dataTable.onDataReturnInitializeTable, scope:this.dataTable});
  };

  /**
   * Displays a temporary status message.
   *
   * @param msg The status message
   */
  YAHOO.convio.datatable.GridView.prototype.setStatus = function(msg) {
    var statusBar = document.getElementById(this.id + "StatusBar");
    if (statusBar) {
      statusBar.innerHTML = (msg ? msg : '');

      if (msg && msg.length > 0) {
        // Update the message. Fade out after 15 seconds.
        YAHOO.util.Dom.setStyle(statusBar, 'opacity', '1');
        setTimeout(function() {
            var fade = new YAHOO.util.Anim(statusBar.id, {opacity: {to: 0}});
            fade.animate();
          }, 15000);
      } else {
        // Clear/hide the message.
        YAHOO.util.Dom.setStyle(statusBar, 'opacity', '0');
      }
    }
  };

  /**
   * Resizes a data table.
   */
  this.resize = function(type, args) {
    var dtable = YAHOO.util.Dom.get(this.id + "DataTable");
    if (! dtable) {
      return;
    }

    var dtableBody = YAHOO.util.Dom.getFirstChildBy(dtable, function(n) {
        return (n && n.className == 'yui-dt-bd');
      });
    if (! dtableBody) {
      return;
    }

    // For %-based heights, adjust to that %.
    if (this.config.height == "100%") {
      YAHOO.util.Dom.setStyle(dtableBody, 'height', "100%");
      return;
    }

    var newHeight = YAHOO.util.Dom.getViewportHeight() - YAHOO.util.Dom.getY(dtableBody);

    // Account for the paginator.
    var paginator = document.getElementById(this.id + "PaginatorContainer");
    if (paginator) {
      newHeight = newHeight - paginator.offsetHeight;
    }

    // Dynamically compute the height offset from any nodes that come after the 
    // data table container, including some extra padding.
    var padding = 20;
    newHeight = newHeight - this._getOffsetHeight() - padding;

    // minimum height
    if (newHeight < 40) {
      newHeight = 40;
    }

    // If gridview is within the dialog, recenter the dialog after re-rendering
    // the gridview.
    YAHOO.convio.dialog.center();

    YAHOO.util.Dom.setStyle(dtableBody, 'height', newHeight + "px");
  };

  /**
   * Determines whether the row selection has changed.
   */
  this._selectionChanged = function(type, args) {
    var dataTable = args;
    var currentSelection = dataTable.getSelectedRows();

    if (currentSelection.length != _previousSelection.length) {
      // Maintain row selection state and fire custom selection changed event.
      _previousSelection = currentSelection;
      dataTable.fireEvent('rowSelectionChangeEvent', dataTable);

      // Add an onSelectionChange listener.
      if (this.onSelectionChange) {
        this.onSelectionChange();
      }

      return true;
    } else {

      for (var i=0; i<_previousSelection.length; i++) {
        if (_previousSelection[i] != currentSelection[i]) {
          // Maintain row selection state and fire custom selection changed event.
          _previousSelection = currentSelection;
          dataTable.fireEvent('rowSelectionChangeEvent', dataTable);

          // Add an onSelectionChange listener.
          if (this.onSelectionChange) {
            this.onSelectionChange();
          }

          return true;
        }
      }
    }
    return false;
  };

  /**
   * Computes the offset height for a data table.
   */
  this._getOffsetHeight = function() {
    var offsetHeight = 0;

    var dtableContainer = document.getElementById(this.id);
    if (dtableContainer) {

      // younger siblings
      var sibling = dtableContainer.nextSibling;
      while (sibling) {
        if (sibling.offsetHeight && sibling.nodeType == 1 && sibling.nodeName != "SCRIPT") {
          offsetHeight += sibling.offsetHeight;
        }
        sibling = sibling.nextSibling;
      }


      var dialogID = YAHOO.convio.dialog.getID();

      // younger uncles/aunts
      var parent = dtableContainer.parentNode;
      while (parent) {

        if (dialogID !== null && parent.id == dialogID) {
          // If in an xdialog, don't count nodes outside the xdialog.
          break;
        }

        sibling = parent.nextSibling;
        while (sibling) {
          if (sibling.offsetHeight && sibling.nodeType == 1 && sibling.nodeName != "SCRIPT") {
            offsetHeight += sibling.offsetHeight;
          }
          sibling = sibling.nextSibling;
        }

        parent = parent.parentNode;
      }
    }

    return offsetHeight;
  };

}



/**
 * create Toolbar object
 * @param id
 */
YAHOO.convio.datatable.Toolbar = function(id){
  this.id = id;
  this.lookup = [];
  
  YAHOO.convio.datatable.Toolbar.prototype.disableTool = function(id) {
    var b = this.lookup[id];
    if (b) {
      b.setEnabled(false);
    }
  };

  YAHOO.convio.datatable.Toolbar.prototype.setEnabled = function(id, doEnable) {
    var b = this.lookup[id];
    if (b) {
      b.setEnabled(doEnable || false);
    }
  };

  /**
   * Fetches a tools.
   */
  YAHOO.convio.datatable.Toolbar.prototype.get = function(id) {
    return this.lookup[id];
  };
  
  YAHOO.convio.datatable.Toolbar.prototype.addButton = function(o) {
    button = new YAHOO.convio.toolbar.ToolbarButton(o);
    if (button) {
      var container = YAHOO.util.Dom.get(this.id);
      container.appendChild(button.cell);
      this.lookup[button.id] = button;
    }
  };
  
  YAHOO.convio.datatable.Toolbar.prototype.addList = function(o) {
    list = new YAHOO.convio.toolbar.DropDown(o);
    if (list) {
      var container = YAHOO.util.Dom.get(this.id);
      container.appendChild(list.cell);
      this.lookup[list.id] = list;
    }
  };

  YAHOO.convio.datatable.Toolbar.prototype.addCheckBox = function(o) {
    var c = new YAHOO.convio.toolbar.CheckBox(o);
    if (c) {
      var container = YAHOO.util.Dom.get(this.id);
      container.appendChild(c.cell);
      this.lookup[c.id] = c;
    }
  };
  
  YAHOO.convio.datatable.Toolbar.prototype.addTextBox = function(o) {
    var textbox = new YAHOO.convio.toolbar.TextBox(o);
    if (textbox) {
      var container = YAHOO.util.Dom.get(this.id);
      container.appendChild(textbox.cell);
      this.lookup[textbox.id] = textbox;
    }
  };

  YAHOO.convio.datatable.Toolbar.prototype.addCalendar = function(o) {
    calendar = new YAHOO.convio.toolbar.ToolbarCalendar(o);
    if (calendar) {
      var container = YAHOO.util.Dom.get(this.id);
      container.appendChild(calendar.cell);
      this.lookup[calendar.id] = calendar;
    }
  };

};
