/**
 * $Source: /home/cvs/cvsroot/cms/integration/web/components/x-tree/x-tree.js,v $
 * $Author: mpih $
 * $Revision: 1.18 $
 * $Date: 2011/04/15 23:50:05 $
 *
 * X-tree methods.
 **/

YAHOO.namespace("convio.tree");

// Registry of x-trees by ID.
YAHOO.convio.tree._registry = [];

/**
 * Fetch a DocumentTree by ID.
 *
 * @param the tree ID
 * @return the YAHOO.convio.tree.DocumentTree or null
 */
YAHOO.convio.tree.get = function(id) {
  return YAHOO.convio.tree._registry[id];
}

/**
 * Shows a folder chooser dialog.
 *
 * @param o args
 *        o.hostID The host
 *        o.folderID (optional) initially selected folder
 *        o.prompt (optional) user prompt
 *        o.requiredPerm (optional) required permission to view folder (e.g., read [deafult], author) 
 *        o.validate validation listener
 *        o.success callback function(folder)
 */
YAHOO.convio.tree.showFolderChooser = function(o) {
  o = o || {};
  o.validate = o.validate || null;
  o.success = o.success || null;
  if (typeof(o.folderID) == 'undefined') {
    o.folderID = null;
  }
  o.prompt = o.prompt || null;

  if (o.hostID == null) {
    alert("hostID is required");
    return;
  }

  o.requiredPerm = o.requiredPerm || 'read';

  var url = '/components/x-tree/folder-tree-dialog.jsp?hostID=' + encodeURIComponent(o.hostID);
  url += '&requiredPerm=' + encodeURIComponent(o.requiredPerm);
  if (o.folderID !== null) {
    url += '&folderID=' + encodeURIComponent(o.folderID);
  }
  var listeners = {
    argument: {
      prompt: o.prompt,
      validate: o.validate
    },
    authenticate: true,
    process: function(r) {
      var args = YAHOO.convio.dialog.getArgs();
      if (o.success != null) {
        o.success(args.folder);
      }
    }
  };

  var cfg = {
    width:'400px'
  };

  YAHOO.convio.dialog.open(url, listeners, cfg);
};

/**
 * Shows a category chooser dialog.
 *
 * @param o args
 *        o.hostID The host
 *        o.categoryID (optional) initially selected category
 *        o.prompt (optional) user prompt
 *        o.success callback function(cat)
 */
YAHOO.convio.tree.showCategoryChooser = function(o) {
  o = o || {};
  o.success = o.success || null;
  if (typeof(o.categoryID) == 'undefined') {
    o.categoryID = null;
  }
  o.prompt = o.prompt || null;

  if (o.hostID == null) {
    alert("hostID is required");
    return;
  }

  var url = '/components/x-tree/category-tree-dialog.jsp?hostID=' + encodeURIComponent(o.hostID);
  if (o.categoryID !== null) {
    url += '&categoryID=' + encodeURIComponent(o.categoryID);
  }

  var listeners = {
    argument: {
      prompt: o.prompt,
      categoryID: o.categoryID
    },
    authenticate: true,
    process: function(r) {
      var args = YAHOO.convio.dialog.getArgs();
      if (o.success != null) {
        o.success(args.category);
      }
    }
  };

  var cfg = {
    width:'400px'
  };

  YAHOO.convio.dialog.open(url, listeners, cfg);
};

YAHOO.convio.tree.DocumentTree = function(o) {

  // Keeps track of the currently selected node.
  var _selectedNode = null;

  // The root node of the document tree (actually the 1st child of the document tree);
  var _rootNode = null;

  // A stack of folderIDs representing the trail to the default-selected folder.
  var _expandIDs = [];

  // State to keep track of auto-expand state.
  var _finalAutoExpand = false;

  // Indicates whether the tree widget is ready for interaction. 
  var _isReady = false;

  /**
   * Sanity check required configuration. Also sets default config values.
   */
  function _initConfig(cfg) {
    cfg = cfg || {};

    if (! cfg.id) {
      alert("id is required");
      return;
    }

    if (typeof(cfg.subsiteID) == "undefined" || cfg.subsiteID === null) {
      alert("subsiteID is required");
      return;
    }

    cfg.requiredPerm = cfg.requiredPerm || 'read';
    cfg.expandIDs = cfg.expandIDs || [];

    return cfg;
  };

  /**
   * Override this method to handle the on-change event.
   */
  this.onChange;


  this.init = function() {
    this.tree = new YAHOO.widget.TreeView(this.id);
    this.root = this.tree.getRoot();

    // Add DocumentTree config to root node data.
    this.root.data.config = this.config;

    this.tree.setDynamicLoad(this.loadChildren);
    this.tree.singleNodeHighlight = true;

    // BZ 52093 - Disable auto-highlighting on collapse/expand.
    var t = this.tree;
    var fixHighlight = function() {
      // Unhighlight the highlighted node.
      var hn = t.getHighlightedNode();
      if (hn) {
        hn.toggleHighlight();
        YAHOO.util.Dom.removeClass(hn.getContentEl(), "ygtvfocus");
        YAHOO.util.Dom.removeClass(hn.getContentEl(), "cms_ygtvfocus");
      }

      // Highlight the selected node.
      if (_selectedNode) {
        _selectedNode.focus();
        _selectedNode.highlight(true);
        // BZ 50888 - fix root node highlighting.
        YAHOO.util.Dom.addClass(_selectedNode.getContentEl(), "ygtvfocus");
        YAHOO.util.Dom.addClass(_selectedNode.getContentEl(), "cms_ygtvfocus");
      }
    };
    this.tree.subscribe('collapse', fixHighlight);
    this.tree.subscribe('expand', fixHighlight);

    this.tree.subscribe('clickEvent', function(o) {
        this.setSelectedNode(o.node);

        // Cancel the expand/collapse. The root node is always expanded.
        if (_selectedNode.data.id == _rootNode.data.id) {
          return false;
        }

      }, this, this);

    // Auto-expand to the selected folder.
    if (this.config.expandIDs.length > 0) {
      _expandIDs = this.config.expandIDs;
      var defaultFolderID = this.config.folderID;

      this.tree.subscribe('expandComplete', function(o) {
          // After the final expand, set the selected node.
          if (_finalAutoExpand) {
            _finalAutoExpand = false;
            var s = t.getNodeByProperty("id", defaultFolderID);
            if (s) {
              this.setSelectedNode(s);
            }
          }

          if (_expandIDs.length > 0) {
            var expandID = _expandIDs.shift();
            var n = t.getNodeByProperty("id", expandID);
            if (n) {
              n.expand();

              // Mark the final expand.
              if (_expandIDs.length == 0) {
                if (n.hasChildren(true)) {
                  // The current node will be expanded. Sselect the default 
                  // node when the expand completes.
                  _finalAutoExpand = true;
                } else {
                  // The current node cannot be expanded any further.
                  // Select the default node now.
                  var s = t.getNodeByProperty("id", defaultFolderID);
                  if (s) {
                    this.setSelectedNode(s);
                  }
                  _finalAutoExpand = false;
                }
              }
            }
          }
        }, this, this);
    }

    // Setup the root node and children.
    this.loadChildren();
  };

  /**
   * Expands the current tree node and renders the children.
   * If no node is passed in, then render the root node too.
   *
   * @param node     The current tree node
   * @param callback A callback function
   */
  this.loadChildren = function(node, callback) {
    var th = this;

    var initialLoad = (! node);

    // The "this" pointer only refers to the DocumentTree object for the initial call to
    // render the root folder. All subsequent calls are done dynamically and only have access
    // to the current node.
    var tree = (node ? node.tree : this.tree);
    var cfg = tree.getRoot().data.config;

    var folderID = (node ? node.data.id : cfg.subsiteID);
    var url = "/components/x-tree/children-retrieve.jsp?folderID=" + encodeURIComponent(folderID);
    url += "&requiredPerm=" + encodeURIComponent(cfg.requiredPerm);
    if (cfg.showDocuments === true) {
      url += "&showDocuments=true";
    }

    YAHOO.util.Connect.asyncRequest('POST', url, {
        success: function(o) {
          var response = YAHOO.lang.JSON.parse(o.responseText);

          if (! node) {
            // Set the root node.

            var rootData = response;
            rootData.children = [];
            rootData.nowrap = true;
            rootData.html = '<img src="' + rootData.icon + '" height="16" width="16" border="0" align="absmiddle" /> ' + rootData.label;
            rootData.expanded = true;
            rootData.hasIcon = false;

            node = new YAHOO.widget.HTMLNode(rootData, tree.getRoot());

            _rootNode = node;
            _selectedNode = node;

            tree.render();
          }

          // Clear the existing child nodes.
          node.tree.removeChildren(node);

          // Add the child nodes to the current node.
          var children = response.children;
          for (var i=0 ; i<children.length; i++) {

            var childData = children[i];
            childData.nowrap = true;
            childData.html = '<img src="' + childData.icon + '" height="16" width="16" border="0" align="absmiddle" /> ' + childData.label;
            childData.expanded = false;
            childData.hasIcon = true;

            var childNode = new YAHOO.widget.HTMLNode(childData, node);
          }

          // Mark the tree as loaded/ready.
          _isReady = true;

          // Notify the TreeView component when the data load is complete.
          if (callback) {
            callback();
          }

          // After initial root load, highlight the root node and
          // center the dialog (if applicable).
          if (initialLoad) {
            th.setSelectedNode(_rootNode, true);

            // Auto-center the dialog.
            YAHOO.convio.dialog.center();
          }
        }
      });
  };

  /**
   * Fetches the currently selected node.
   */
  this.getSelectedNode = function() {
    return _selectedNode;
  };

  /**
   * Sets the selected node.
   */
  this.setSelectedNode = function(n, forceChange) {
    var isChange = forceChange || (!_selectedNode || _selectedNode.data.id != n.data.id);

    // Fix original highlight.
    if (_selectedNode && _selectedNode.data.id != n.data.id) {
      YAHOO.util.Dom.removeClass(_selectedNode.getContentEl(), "ygtvfocus");
      YAHOO.util.Dom.removeClass(_selectedNode.getContentEl(), "cms_ygtvfocus");
    }

    // Mark the selected node.
    _selectedNode = n;

    // BZ 50888 - fixed root node highlighting.
    _selectedNode.focus();
    _selectedNode.highlight(true);

    YAHOO.util.Dom.addClass(_selectedNode.getContentEl(), "ygtvfocus");
    YAHOO.util.Dom.addClass(_selectedNode.getContentEl(), "cms_ygtvfocus");

    // Call custom onChange handler if the selected node has changed.
    if (isChange && (this.onChange && typeof(this.onChange) == "function")) {
      this.onChange();
    }
  };

  this.config = _initConfig(o);
  this.id = this.config.id;

  this.tree = this.init();

  // Register the tree.
  YAHOO.convio.tree._registry[this.id] = this;
};

YAHOO.convio.tree.CategoryTree = function(o) {

  // Keeps track of the currently selected node.
  var _selectedNode = null;

  // The root node of the document tree (actually the 1st child of the document tree);
  var _rootNode = null;

  // A stack of categoryIDs representing the trail to the default-selected category.
  var _expandIDs = [];

  // State to keep track of auto-expand state.
  var _finalAutoExpand = false;

  // Indicates whether the tree widget is ready for interaction. 
  var _isReady = false;

  /**
   * Sanity check required configuration. Also sets default config values.
   */
  function _initConfig(cfg) {
    cfg = cfg || {};

    if (! cfg.id) {
      alert("id is required");
      return;
    }

    if (typeof(cfg.rootID) == "undefined" || cfg.rootID === null) {
      alert("rootID is required");
      return;
    }

    return cfg;
  };

  /**
   * Override this method to handle the on-change event.
   */
  this.onChange;


  this.init = function() {
    this.tree = new YAHOO.widget.TreeView(this.id);
    this.root = this.tree.getRoot();

    // Add DocumentTree config to root node data.
    this.root.data.config = this.config;

    this.tree.setDynamicLoad(this.loadChildren);
    this.tree.singleNodeHighlight = true;

    // BZ 52093 - Disable auto-highlighting on collapse/expand.
    var t = this.tree;
    var fixHighlight = function() {
      // Unhighlight the highlighted node.
      var hn = t.getHighlightedNode();
      if (hn) {
        hn.toggleHighlight();
        YAHOO.util.Dom.removeClass(hn.getContentEl(), "ygtvfocus");
        YAHOO.util.Dom.removeClass(hn.getContentEl(), "cms_ygtvfocus");
      }

      // Highlight the selected node.
      if (_selectedNode) {
        _selectedNode.focus();
        _selectedNode.highlight(true);
        // BZ 50888 - fix root node highlighting.
        YAHOO.util.Dom.addClass(_selectedNode.getContentEl(), "ygtvfocus");
        YAHOO.util.Dom.addClass(_selectedNode.getContentEl(), "cms_ygtvfocus");
      }
    };
    this.tree.subscribe('collapse', fixHighlight);
    this.tree.subscribe('expand', fixHighlight);

    this.tree.subscribe('clickEvent', function(o) {
        var isChange = (!_selectedNode || _selectedNode.data.id != o.node.data.id);
        if (isChange && _selectedNode) {
          YAHOO.util.Dom.removeClass(_selectedNode.getContentEl(), "ygtvfocus");
          YAHOO.util.Dom.removeClass(_selectedNode.getContentEl(), "cms_ygtvfocus");
        }

        // Mark the selected node.
        this.setSelectedNode(o.node);

        // Call custom onChange handler if the selected node has changed.
        if (isChange && (this.onChange && typeof(this.onChange) == "function")) {
          this.onChange();
        }

        // Cancel the expand/collapse. The root node is always expanded.
        if (_selectedNode.data.id == _rootNode.data.id) {
          return false;
        }

      }, this, this);

    // Auto-expand to the selected folder.
    if (this.config.expandIDs.length > 0) {
      _expandIDs = this.config.expandIDs;
      var defaultFolderID = this.config.folderID;

      this.tree.subscribe('expandComplete', function(o) {

          // After the final expand, set the selected node.
          if (_finalAutoExpand) {
            _finalAutoExpand = false;
            var s = t.getNodeByProperty("id", defaultFolderID);
            if (s) {
              this.setSelectedNode(s);
            }
          }

          if (_expandIDs.length > 0) {
            var expandID = _expandIDs.shift();
            var n = t.getNodeByProperty("id", expandID);
            if (n) {
              n.expand();

              // Mark the final expand.
              if (_expandIDs.length == 0) {
                if (n.hasChildren(true)) {
                  // The current node will be expanded. Sselect the default 
                  // node when the expand completes.
                  _finalAutoExpand = true;
                } else {
                  // The current node cannot be expanded any further.
                  // Select the default node now.
                  var s = t.getNodeByProperty("id", defaultFolderID);
                  if (s) {
                    this.setSelectedNode(s);
                  }
                  _finalAutoExpand = false;
                }
              }
            }
          }
        }, this, this);
    }

    // Setup the root node and children.
    this.loadChildren();
  };

  /**
   * Expands the current tree node and renders the children.
   * If no node is passed in, then render the root node too.
   *
   * @param node     The current tree node
   * @param callback A callback function
   */
  this.loadChildren = function(node, callback) {
    var th = this;

    var initialLoad = (! node);

    // The "this" pointer only refers to the CategoryTree object for the initial call to
    // render the root folder. All subsequent calls are done dynamically and only have access
    // to the current node.
    var tree = (node ? node.tree : this.tree);
    var cfg = tree.getRoot().data.config;

    var categoryID = (node ? node.data.id : cfg.rootID);
    var url = "/components/x-tree/category-children-retrieve.jsp?categoryID=" + encodeURIComponent(categoryID);
    url += "&requiredPerm=" + encodeURIComponent(cfg.requiredPerm);
    if (cfg.showDocuments === true) {
      url += "&showDocuments=true";
    }

    YAHOO.util.Connect.asyncRequest('POST', url, {
        success: function(o) {
          var response = YAHOO.lang.JSON.parse(o.responseText);

          if (! node) {
            // Set the root node.

            var rootData = response;
            rootData.children = [];
            rootData.nowrap = true;
            rootData.html = '<img src="' + rootData.icon + '" height="16" width="16" border="0" align="absmiddle" /> ' + rootData.label;
            rootData.expanded = true;
            rootData.hasIcon = false;

            node = new YAHOO.widget.HTMLNode(rootData, tree.getRoot());

            _rootNode = node;
            _selectedNode = node;

            tree.render();
          }

          // Clear the existing child nodes.
          node.tree.removeChildren(node);

          // Add the child nodes to the current node.
          var children = response.children;
          for (var i=0 ; i<children.length; i++) {

            var childData = children[i];
            childData.nowrap = true;
            childData.html = '<img src="' + childData.icon + '" height="16" width="16" border="0" align="absmiddle" /> ' + childData.label;
            childData.expanded = false;
            childData.hasIcon = true;

            var childNode = new YAHOO.widget.HTMLNode(childData, node);
          }

          // Mark the tree as loaded/ready.
          _isReady = true;

          // Notify the TreeView component when the data load is complete.
          if (callback) {
            callback();
          }

          // After initial root load, highlight the root node and
          // center the dialog (if applicable).
          if (initialLoad) {
            th.setSelectedNode(_rootNode, true);

            // Auto-center the dialog.
            YAHOO.convio.dialog.center();
          }
        }
      });
  };

  /**
   * Fetches the currently selected node.
   */
  this.getSelectedNode = function() {
    return _selectedNode;
  };

  /**
   * Sets the selected node.
   */
  this.setSelectedNode = function(n, forceChange) {
    var isChange = forceChange || (!_selectedNode || _selectedNode.data.id != n.data.id);

    // Fix original highlight.
    if (_selectedNode && _selectedNode.data.id != n.data.id) {
      YAHOO.util.Dom.removeClass(_selectedNode.getContentEl(), "ygtvfocus");
      YAHOO.util.Dom.removeClass(_selectedNode.getContentEl(), "cms_ygtvfocus");
    }

    // Mark the selected node.
    _selectedNode = n;

    // BZ 50888 - fixed root node highlighting.
    _selectedNode.focus();
    _selectedNode.highlight(true);

    YAHOO.util.Dom.addClass(_selectedNode.getContentEl(), "ygtvfocus");
    YAHOO.util.Dom.addClass(_selectedNode.getContentEl(), "cms_ygtvfocus");

    // Call custom onChange handler if the selected node has changed.
    if (isChange && (this.onChange && typeof(this.onChange) == "function")) {
      this.onChange();
    }
  };

  this.config = _initConfig(o);
  this.id = this.config.id;

  this.tree = this.init();

  // Register the tree.
  YAHOO.convio.tree._registry[this.id] = this;
};
