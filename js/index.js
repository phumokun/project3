angular.module('forcedirectedApp', [])
  .directive('forcedirectedChart', function() {
    return {
      restrict: 'E',
      scope: {
        links: '='
      },
      template: '<div class="forcedirected-chart"><div id="forcedirectedPanel{{panelIndex}}"></div>',
      link: function(scope, elem, attr) {
        scope.panelIndex = Math.floor((Math.random() * 10000) + 1);
        var margin = {
          top: 8,
          right: 8,
          bottom: 8,
          left: 8
        };

        function circlePath(cx, cy, r) {
          return 'M ' + cx + ' ' + cy + ' m -' + r + ', 0 a ' + r + ',' + r + ' 0 1,0 ' + (r * 2) + ',0 a ' + r + ',' + r + ' 0 1,0 -' + (r * 2) + ',0';
        }

        function hexagonPath(cx, cy, a) {
          var h = a * Math.sin(Math.PI / 3);
          var points = [];
          points.push({
            x: cx - a,
            y: cy
          });
          points.push({
            x: cx - a / 2,
            y: cy + h
          });
          points.push({
            x: cx + a / 2,
            y: cy + h
          });
          points.push({
            x: parseInt(cx) + parseInt(a),
            y: cy
          });
          points.push({
            x: cx + a / 2,
            y: cy - h
          });
          points.push({
            x: cx - a / 2,
            y: cy - h
          });
          points.push({
            x: cx - a,
            y: cy
          }); /// ?????
          var path = "M 0 0";
          for (var i = 0; i < points.length; i++) {
            var p = points[i];
            path += "L" + p.x + " " + p.y + " ";
          }
          return path + " Z";
        }

        var nodePaths = function(type, r) {
          if (type == "hexagon")
            return hexagonPath(0, 0, r);
          else
            return circlePath(0, 0, r);

        };

        var nodeTypeIcon = scope.$eval(attr.nodeTypeIcon);
        if (typeof attr.linkLine == 'undefined' || attr.linkLine === null)
          attr.linkLine = "bezier";

        var linkLength = 120;
        if (typeof attr.linkLength != 'undefined' && attr.linkLength !== null && attr.linkLength !== "null" && attr.linkLength !== "") {
          linkLength = attr.linkLength;
        }

        var radiusMin = 10;
        var radius = Math.round(radiusMin + radiusMin / 2);

        if (typeof attr.nodeSize != 'undefined' && attr.nodeSize !== null && attr.nodeSize !== "null" && attr.nodeSize !== "") {
          radius = attr.nodeSize;
          radiusMin = Math.round(2 * radius / 3);
        }

        var computeStatistic = false;
        if (attr.computeStatistic == 'true')
          computeStatistic = true;

        scope.$watch('links', function() {
          var width = (typeof attr.width == 'undefined' || attr.width === null) ? 500 : parseInt(attr.width);
          var height = (typeof attr.height == 'undefined' || attr.height === null) ? 500 : parseInt(attr.height);

          height = height - margin.top - margin.bottom;
          var links = scope.links;
          var nodes = {};
          var linksTypes = {};
          scope.legendBlocks = {
            "Links": {
              items: [],
              name: "Links"
            }
          };

          // Compute the distinct nodes from the links.
          links.forEach(function(link) {
            var nodeIcon = 'circle';
            if (typeof nodeTypeIcon != 'undefined' && nodeTypeIcon !== null && nodeTypeIcon[link.sourceType] != 'undefined')
              nodeIcon = nodeTypeIcon[link.sourceType];

            link.source = nodes[link.source + "_" + link.sourceType] || (nodes[link.source + "_" + link.sourceType] = {
              name: link.source,
              type: link.sourceType,
              label: link.sourceLabel,
              count: 0,
              radius: radius,
              nodeIcon: nodeIcon
            });
            nodes[link.source.name + "_" + link.sourceType].count += link.count;

            nodeIcon = 'circle';
            if (typeof nodeTypeIcon != 'undefined' && nodeTypeIcon !== null && nodeTypeIcon[link.sourceType] != 'undefined')
              nodeIcon = nodeTypeIcon[link.targetType];

            link.target = nodes[link.target + "_" + link.targetType] || (nodes[link.target + "_" + link.targetType] = {
              name: link.target,
              type: link.targetType,
              label: link.targetLabel,
              count: 0,
              radius: radius,
              nodeIcon: nodeIcon
            });
            nodes[link.target.name + "_" + link.targetType].count += link.count;

            // prepare legend for links
            if (typeof linksTypes[link.type] == 'undefined') {
              linksTypes[link.type] = link.type;
              scope.legendBlocks.Links.items.push({
                "label": link.type,
                "style": "Links " + link.type
              });
            }
          });

          scope.legendNodes = [];

          for (var key in nodes) {
            if (nodes.hasOwnProperty(key)) {
              var nodeType = nodes[key].type;
              if (typeof scope.legendBlocks[nodeType] == 'undefined')
                scope.legendBlocks[nodeType] = {
                  "name": nodeType,
                  "label": nodes[key].label,
                  "items": []
                };
              scope.legendBlocks[nodeType].items.push({
                "label": nodes[key].name,
                "style": nodes[key].type + " " + clearString(nodes[key].name.split(' ').join('_'))
              });

            }
          }

          var force = d3.layout.force().nodes(d3.values(nodes)).links(links).size([width, height]).linkDistance(linkLength).charge(-800).on("tick", tick)
            .start();

          d3.select("#forcedirectedPanel" + scope.panelIndex + " svg").remove();
          var svg = d3.select("#forcedirectedPanel" + scope.panelIndex).append("svg").attr("class", "forcedirected-chart").attr("width",
            width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);

          var path = svg.append("g").selectAll("path").data(force.links()).enter().append("path").attr("class", function(d) {
            return "link link_" + d.type + " " + "source_" + clearString(d.source.name.split(' ').join('_')) + " " + "target_" + clearString(d.target.name.split(' ').join('_')) +
              " link_" + d.sourceType + "_" + d.targetType;
          }).attr("marker-end", function(d) {
            return "url(#link_" + d.sourceType + "_" + d.targetType + ")";
          });

          var circle = svg.append("g").selectAll("circle").data(force.nodes()).enter().append("path")
            .attr("d", function(d) {
              return nodePaths(d.nodeIcon, d.radius);
            }).attr("class", function(d) {
              var clazz = "node " + d.type;
              if (typeof d.name != 'undefined')
                clazz += " " + clearString(d.name.split(' ').join('_'));
              return clazz;
            }).call(force.drag);

          var text = svg.append("g").selectAll("text").data(force.nodes()).enter().append("text").attr("x", 8).attr("y", ".31em").attr("class", function(d) {
            var clazz = "label " + d.type;
            if (typeof d.name != 'undefined')
              clazz += " " + clearString(d.name.split(' ').join('_'));
            return clazz;
          }).text(function(d) {
            return d.name;
          });

          function tick(d) {
            path.attr("d", linkLine);
            circle.attr("transform", transform);
            text.attr("transform", transform);
          }

        });

        function linkLine(d) {
          if (attr.linkLine == "bezier")
            return linkBezier(d);
          else if (attr.linkLine == "arc")
            return linkArc(d);
          else if (attr.linkLine == "straight")
            return linkStraight(d);
          else
            return linkBezier(d);
        }

        function linkArc(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
        }

        function linkStraight(d) {
          return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
        }

        function clearString(input) {
          return input.replace(/[^\w\s]/gi, '');
        }

        function linkBezier(d) {
          var curvature = 0.5;
          var xi = d3.interpolateNumber(d.source.x, d.target.x);
          var x2 = xi(curvature);
          var x3 = xi(1 - curvature);

          return "M" + d.source.x + "," + d.source.y +
            "C" + x2 + "," + d.source.y +
            " " + x3 + "," + d.target.y +
            " " + d.target.x + "," + d.target.y;
        }

        function transform(d) {
          return "translate(" + d.x + "," + d.y + ")";
        }

      }
    };

  }).controller('forcedirectedController', function($scope) {
    $scope.mcuSimple = [{source:"วิทยาเขตปัตตานี", sourceType: "Character",target:"Prince of Songkla University", targetType: "Campus",type:"Main"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"Prince of Songkla University", targetType: "Campus",type:"Main"},
      {source:"วิทยาเขตภูเก็ต", sourceType: "Character",target:"Prince of Songkla University", targetType: "Campus",type:"Main"},
      {source:"วิทยาเขตสุราษฎร์ธานี", sourceType: "Character",target:"Prince of Songkla University", targetType: "Campus",type:"Main"},
      {source:"วิทยาเขตตรัง", sourceType: "Character",target:"Prince of Songkla University", targetType: "Campus",type:"Main"},

      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"บัณฑิตวิทยาลัย", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะวิทยาศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะวิศวกรรมศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะทรัพยากรธรรมชาติ", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะอุตสาหกรรมเกษตร", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะการจัดการสิ่งแวดล้อม", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะแพทยศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะพยาบาลศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"วิทยาลัยนานาชาติ", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะทันตแพทยศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะเภสัชศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะวิทยาการจัดการ", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะศิลปศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะเศรษฐศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะนิติศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะการแพทย์แผนไทย", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"คณะเทคนิคการแพทย์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตหาดใหญ่", sourceType: "Character",target:"โครงการจัดตั้งคณะสัตวแพทยศาสตร์", targetType: "Campus",type:"Side"},

      {source:"วิทยาเขตปัตตานี", sourceType: "Character",target:"คณะศึกษาศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตปัตตานี", sourceType: "Character",target:"คณะมนุษยศาสตร์และสังคมศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตปัตตานี", sourceType: "Character",target:"คณะวิทยาศาสตร์และเทคโนโลยี", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตปัตตานี", sourceType: "Character",target:"คณะศิลปกรรมศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตปัตตานี", sourceType: "Character",target:"คณะวิทยาการสื่อสาร", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตปัตตานี", sourceType: "Character",target:"คณะรัฐศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตปัตตานี", sourceType: "Character",target:"วิทยาลัยอิสลามศึกษา", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตปัตตานี", sourceType: "Character",target:"คณะพยาบาลศาสตร์", targetType: "Campus",type:"Side"},

      {source:"วิทยาเขตภูเก็ต", sourceType: "Character",target:"คณะการบริการและการท่องเที่ยว", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตภูเก็ต", sourceType: "Character",target:"คณะเทคโนโลยีและสิ่งแวดล้อม", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตภูเก็ต", sourceType: "Character",target:"คณะวิศวกรรมศาสตร์", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตภูเก็ต", sourceType: "Character",target:"คณะวิเทศศึกษา", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตภูเก็ต", sourceType: "Character",target:"วิทยาลัยชุมชนภูเก็ต", targetType: "Campus",type:"Side"},

      {source:"วิทยาเขตสุราษฎร์ธานี", sourceType: "Character",target:"คณะวิทยาศาสตร์และเทคโนโลยีอุตสาหกรรม", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตสุราษฎร์ธานี", sourceType: "Character",target:"คณะศิลปศาสตร์และวิทยาการจัดการ", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตสุราษฎร์ธานี", sourceType: "Character",target:"วิทยาลัยชุมชนสุราษฎร์ธานี", targetType: "Campus",type:"Side"},

      {source:"วิทยาเขตตรัง", sourceType: "Character",target:"คณะพาณิชยศาสตร์และการจัดการ", targetType: "Campus",type:"Side"},
      {source:"วิทยาเขตตรัง", sourceType: "Character",target:"คณะสถาปัตยกรรมศาสตร์", targetType: "Campus",type:"Side"},
    
      ];
  });