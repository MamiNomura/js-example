/**
 * @author Michael Pih (mpih@convio.com)
 * @version $Id: item-chooser.js,v 1.48 2011/08/11 23:50:54 mpih Exp $
 *
 * Standard chooser dialogs.
 */

YAHOO.namespace("convio.itemchooser");
YAHOO.convio.itemchooser = {

  // Flag used to serialize item chooser dialog requests.
  _isLoading: false,

  /**
   * Shows an item chooser dialog.
   *
   * @param folderID The folder
   * @param config   Item chooser configuration
   * @param callbackFn The callback function, of the form function(item),
   *          where item contains the following attributes: text, url
   */
  showItemChooser: function(folderID, config, callbackFn) {
    if (this._isLoading) {
        return;
    }

    var configuration = {
      argument: {
        links: config.links
      },
      authenticate: true,

      process: function(o) {
        var args = YAHOO.convio.dialog.getArgs();
        
        if (args.returnValue && args.returnValue.isCOMLink) {
          YAHOO.convio.itemchooser.COMLinksTab.launchOptionsDialog(args.returnValue, callbackFn);
        } else if (callbackFn != null) {
          // should ensure it has a url and a text variable
          callbackFn(args.returnValue);
        }
      },

      isReady: function() {
        // Don't allow the dialog to be acted upon until the tree has been loaded.
        return YAHOO.convio.itemchooser.ChooserUtil.ready;
      },

      destroy: function(o) {
        // Destroy the browse tab.
        YAHOO.convio.itemchooser.BrowseTab.destroy();
        
        // Destroy the context menus.
        YAHOO.convio.itemchooser.CmsChooserContextMenu.destroy();

        // Destroy tab view.
        YAHOO.convio.itemchooser.ChooserUtil.tabView = null;

        //Defensive programming - just in case we were still in "_isLoading":
        YAHOO.convio.itemchooser._isLoading = false;
      }
    };

    //The folder ID that's passed in here is used to determine which host to show the dialog for.
    var url = "/components/x-dialog/chooser/chooser.jsp?folderID=" + encodeURIComponent(folderID);
    if (config["basetype"] != undefined) {
      url += "&baseType=" + config["basetype"];
    }
    if (config["itemID"] != undefined) {
      url += "&itemID=" + config["itemID"];
    }
    if (config["startTab"] != undefined) {
      url += "&startTab=" + config["startTab"];
    }
    if (config["filterID"] != undefined) {
      url += "&filterID=" + config["filterID"];
    }
    if (config["showLinks"] != undefined) {
      url += "&showLinks=" + config["showLinks"];            
      if (config["linkTitle"] != undefined) {    
      	url += "&linkTitle=" + config["linkTitle"]; 	
      }      
    }

    var sizeConfig = {
        width: '850px',
        height: ((YAHOO.env.ua.ie > 0) ? '560px' : '550px')
    };
    if (config.showLinks) {
      sizeConfig.width = '1050px';
      sizeConfig.height = '505px';
    }
   
    // isLinkSet, componentID, typeID are used for selecting items for linkset
    // linkset dialog will have 3rd panel on the right and will submit a form
    // to create a new linkset.
    if (config.isLinkSet) {
      sizeConfig.height = '570px';
      sizeConfig.width = '1080px';
      url += "&isLinkSet=true";
    }
    if (config["componentID"] != undefined) {
        url += "&componentID=" + config["componentID"];
    }
    if (config["typeID"] != undefined) {
        url += "&typeID=" + config["typeID"];
    }

    if (config["showCOMLinksTab"] != undefined) {
      url += "&showCOMLinksTab=" + config["showCOMLinksTab"];
    }

    YAHOO.convio.dialog.open(url, configuration, sizeConfig);
  }
  
};
