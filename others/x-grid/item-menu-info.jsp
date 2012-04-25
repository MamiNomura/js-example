<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-grid/item-menu-info.jsp,v $
 $Author: mpih $
 $Revision: 1.4 $
 $Date: 2010/06/08 19:52:34 $
--%>

<%@ page contentType="text/javascript"
         import="com.frontleaf.content.DocumentTools,
                 com.frontleaf.content.ExtendedType,
                 com.frontleaf.content.Folder,
                 com.frontleaf.content.Item,
                 com.frontleaf.record.ExtendedTypeWizard,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.util.JSONTools,
                 com.frontleaf.yui.YUIMenu" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="itemID" type="integer"/>
</rc:request>

<%
  DispatcherTools.disableCache(response);

  final User user = (User) request.getUserPrincipal();
  if (user == null || user.isAnonymous()) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;
  }

  final Integer itemID = requestData.getInteger("itemID");
  final Item item = Item.find(itemID);
  if (item == null) {
    return;
  }

  Folder folder = item.getFolder();
  boolean isAuthor = folder.checkPermission(user, "author");

  ExtendedType extendedType = item.getExtendedType();
  ExtendedTypeWizard wizard = new ExtendedTypeWizard(extendedType);

  String mID = "itemContextMenu-" + itemID;
  String mClass = "itemContextMenu";

  YUIMenu menu = new YUIMenu(mID, "itemContextMenu");

  // Authoring wizard menu options.
  YUIMenu.YUIMenuItem mi = null;
  if (isAuthor) {
    mi = menu.add(mID + "-status", "Status", "/admin/item/actions/status.jsp?itemID=" + itemID, mClass + "-status");
    mi.setTarget("_top");

    mi = menu.add(mID + "-properties", "Edit Properties", "/admin/item/actions/properties-edit.jsp?itemID=" + itemID, mClass + "-properties");
    mi.setTarget("_top");

    if (wizard.hasStepType(ExtendedTypeWizard.STEP_EDITOR)) {
      mi = menu.add(mID + "-body", "Edit Body", "/admin/item/actions/body-edit.jsp?itemID=" + itemID, mClass + "-body");
      mi.setTarget("_top");
    }
    if (wizard.hasStepType(ExtendedTypeWizard.STEP_PREVIEW)) {
      mi = menu.add(mID + "-preview", "Preview", "/admin/item/actions/preview.jsp?itemID=" + itemID, mClass + "-preview");
      mi.setTarget("_top");
    }
  }

  // The "View live" menu option is available to all users.
  if (item.isLive()) {
    mi = menu.add(mID + "-live", "Live", DocumentTools.getURL(itemID, false), mClass + "-live");
    mi.setTarget("_live");
  }

  JSONTools.write(response, menu.toJSON());
%>
