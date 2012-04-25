<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/chooser/image-template-retrieve.jsp,v $
 $Author: marick $
 $Revision: 1.1 $
 $Date: 2009/10/12 21:48:16 $

 ====================================================================

 Copyright (C) 2002-04 Frontleaf. All Rights Reserved.

 Use, modification and distribution of this Software in source or
 object form is strictly prohibited without prior agreement
 with Frontleaf.  Frontleaf reserves all rights not expressly granted to
 you in such an agreement.

 Send all inquiries to license (at) frontleaf.com.
--%>

<%@ page contentType="text/javascript; charset=UTF-8"
         import="java.io.IOException,java.io.StringWriter,
                 com.frontleaf.content.*,com.frontleaf.sql.*,
                 com.frontleaf.pagelet.*,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.util.StringTools,
                 com.frontleaf.content.template.DocumentContext,
                 com.frontleaf.content.template.ItemTemplate,
                 org.json.JSONObject"%>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="itemID" type="integer" required="false"/>
  <parameter name="imageID" type="item"/>
</rc:request>

<%
  User user = (User) request.getUserPrincipal();
  // TO DO: check permission

  Integer itemID = requestData.getInteger("itemID");

  Document image = (Document) requestData.getObject("imageID");

  ItemTemplate template = ItemTemplate.getDefault(image.getExtendedType());  
  PageletType pageletType = null;
  Pagelet pagelet = null;
  StringWriter sout = null;

  if (template != null) { 

    sout = new StringWriter();
    DocumentContext context = 
      new DocumentContext(image, request, response, sout);
    template.write(context); 

    pageletType = PageletType.find("image");
    if (pageletType == null) {
      throw new NullPointerException("Image component not found.");
    }
    pagelet = new Pagelet(pageletType, image.getHost());
    pagelet.setQueryString("templateID=" + template.getID() + 
                           "&imageID=" + image.getID());
    pagelet.create();

    if (itemID != null) {
      Query query = StatementCatalog.getQuery("Item", "itemExists");
      query.setInteger("itemID", itemID);
      if (query.getBoolean()) {
	Layout layout = Layout.getInstance(itemID);
	if (layout == null) {
	  layout = new Layout(LayoutType.getInstance("body"), itemID);
	}

	layout.addPagelet(pagelet, 0, 0);
	layout.save();
      }
    }
  } 
  JSONObject responseJSON = new JSONObject();
  
  JSONObject imageTemplateJSON = new JSONObject();
  responseJSON.put("ImageTemplate", imageTemplateJSON);
  
  if (template != null) {
    imageTemplateJSON.put("pageletID", pageletType.getKey() + "-" + pagelet.getID());
    imageTemplateJSON.put("content", sout.toString());
  } else {
    imageTemplateJSON.put("pageletID", "");
    imageTemplateJSON.put("content", "");
  }

  response.resetBuffer();
  out.write(responseJSON.toString());
%>
