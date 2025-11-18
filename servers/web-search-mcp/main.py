#!/usr/bin/env python3
"""
Web Search MCP Server
Provides web search and content fetching capabilities for MCP clients

Tools available:
- webSearch: Search the web using various search engines
- fetchWebpage: Fetch and parse webpage content
- extractLinks: Extract all links from a webpage
- scrapeData: Scrape structured data from a webpage
"""

import sys
import json
import os
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
import requests
from bs4 import BeautifulSoup
import aiohttp
from urllib.parse import urljoin, urlparse, quote

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if '--debug' in sys.argv else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger('web-search-mcp')


class WebSearchMCP:
    """MCP Server for web search and scraping operations"""

    def __init__(self):
        self.server_name = os.environ.get('MCP_NAME', 'web-search-mcp')
        self.tools = {}
        self.session = None
        self.cache = {}  # Simple in-memory cache
        self.cache_ttl = 300  # 5 minutes

    async def initialize(self):
        """Initialize the MCP server"""
        logger.info(f"Initializing {self.server_name}")

        # Create aiohttp session
        self.session = aiohttp.ClientSession(
            headers={
                'User-Agent': 'Mozilla/5.0 (compatible; MCP-Bot/1.0)'
            }
        )

        # Register tools
        self.register_tool('webSearch', self.web_search)
        self.register_tool('fetchWebpage', self.fetch_webpage)
        self.register_tool('extractLinks', self.extract_links)
        self.register_tool('scrapeData', self.scrape_data)

        # Send initialization response
        self.send_response({
            'type': 'initialize',
            'status': 'success',
            'serverName': self.server_name,
            'version': '1.0.0',
            'tools': [
                {
                    'name': name,
                    'description': self.get_tool_description(name)
                }
                for name in self.tools.keys()
            ]
        })

        logger.info(f"Server initialized with {len(self.tools)} tools")

    def register_tool(self, name: str, handler):
        """Register a tool handler"""
        self.tools[name] = handler
        logger.debug(f"Registered tool: {name}")

    def get_tool_description(self, tool_name: str) -> str:
        """Get description for a tool"""
        descriptions = {
            'webSearch': 'Search the web using DuckDuckGo (no API key required)',
            'fetchWebpage': 'Fetch and parse webpage content',
            'extractLinks': 'Extract all links from a webpage',
            'scrapeData': 'Scrape structured data from a webpage using CSS selectors'
        }
        return descriptions.get(tool_name, 'No description available')

    def send_response(self, response: Dict[str, Any]):
        """Send response to stdout"""
        print(json.dumps(response), flush=True)

    def send_error(self, error: Exception, request_id: Optional[str] = None):
        """Send error response"""
        self.send_response({
            'type': 'error',
            'requestId': request_id,
            'error': {
                'code': getattr(error, 'code', 'INTERNAL_ERROR'),
                'message': str(error),
                'details': getattr(error, '__traceback__', None)
            }
        })

    async def web_search(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Search the web using DuckDuckGo HTML version (no API key required)
        """
        query = params.get('query', '')
        max_results = min(params.get('maxResults', 10), 20)

        if not query:
            return {
                'success': False,
                'error': 'Query parameter is required'
            }

        try:
            # Use DuckDuckGo HTML search (no API key required)
            search_url = 'https://html.duckduckgo.com/html/'
            search_params = {
                'q': query,
                's': '0',
                'dc': '0',
                'v': 'l',
                'o': 'json'
            }

            async with self.session.post(search_url, data=search_params) as response:
                html = await response.text()

            soup = BeautifulSoup(html, 'lxml')
            results = []

            # Parse search results
            for result in soup.find_all('div', class_='result', limit=max_results):
                title_elem = result.find('a', class_='result__a')
                snippet_elem = result.find('a', class_='result__snippet')

                if title_elem:
                    title = title_elem.get_text(strip=True)
                    url = title_elem.get('href', '')

                    # DuckDuckGo URLs are redirects, extract actual URL
                    if url.startswith('//duckduckgo.com/l/'):
                        url_params = urlparse(url).query
                        if 'uddg=' in url_params:
                            import urllib.parse
                            url = urllib.parse.unquote(url_params.split('uddg=')[1].split('&')[0])

                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ''

                    results.append({
                        'title': title,
                        'url': url,
                        'snippet': snippet,
                        'source': 'DuckDuckGo'
                    })

            return {
                'success': True,
                'query': query,
                'results': results,
                'count': len(results)
            }

        except Exception as e:
            logger.error(f"Search failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def fetch_webpage(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fetch and parse webpage content
        """
        url = params.get('url', '')
        extract_text = params.get('extractText', True)
        extract_metadata = params.get('extractMetadata', True)

        if not url:
            return {
                'success': False,
                'error': 'URL parameter is required'
            }

        # Check cache
        cache_key = f"fetch:{url}"
        if cache_key in self.cache:
            cached_time, cached_data = self.cache[cache_key]
            if (datetime.now() - cached_time).seconds < self.cache_ttl:
                return cached_data

        try:
            async with self.session.get(url, timeout=10) as response:
                html = await response.text()
                content_type = response.headers.get('Content-Type', '')

            soup = BeautifulSoup(html, 'lxml')

            result = {
                'success': True,
                'url': str(response.url),
                'statusCode': response.status,
                'contentType': content_type
            }

            if extract_text:
                # Remove script and style elements
                for script in soup(['script', 'style']):
                    script.decompose()

                # Extract text
                text = soup.get_text()
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = ' '.join(chunk for chunk in chunks if chunk)

                result['text'] = text[:10000]  # Limit text length
                result['textLength'] = len(text)

            if extract_metadata:
                metadata = {}

                # Extract title
                title = soup.find('title')
                if title:
                    metadata['title'] = title.get_text(strip=True)

                # Extract meta tags
                for meta in soup.find_all('meta'):
                    name = meta.get('name') or meta.get('property')
                    content = meta.get('content')
                    if name and content:
                        metadata[name] = content

                # Extract headings
                headings = {
                    'h1': [h.get_text(strip=True) for h in soup.find_all('h1', limit=5)],
                    'h2': [h.get_text(strip=True) for h in soup.find_all('h2', limit=5)]
                }
                metadata['headings'] = headings

                result['metadata'] = metadata

            # Cache the result
            self.cache[cache_key] = (datetime.now(), result)

            return result

        except asyncio.TimeoutError:
            return {
                'success': False,
                'error': 'Request timeout'
            }
        except Exception as e:
            logger.error(f"Fetch failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def extract_links(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract all links from a webpage
        """
        url = params.get('url', '')
        internal_only = params.get('internalOnly', False)
        external_only = params.get('externalOnly', False)

        if not url:
            return {
                'success': False,
                'error': 'URL parameter is required'
            }

        try:
            async with self.session.get(url, timeout=10) as response:
                html = await response.text()
                base_url = str(response.url)

            soup = BeautifulSoup(html, 'lxml')
            parsed_base = urlparse(base_url)
            links = []
            seen = set()

            for link in soup.find_all('a', href=True):
                href = link['href']
                absolute_url = urljoin(base_url, href)
                parsed_url = urlparse(absolute_url)

                # Skip if already seen
                if absolute_url in seen:
                    continue
                seen.add(absolute_url)

                # Check internal/external filters
                is_internal = parsed_url.netloc == parsed_base.netloc
                if internal_only and not is_internal:
                    continue
                if external_only and is_internal:
                    continue

                links.append({
                    'url': absolute_url,
                    'text': link.get_text(strip=True)[:100],
                    'internal': is_internal,
                    'protocol': parsed_url.scheme
                })

            return {
                'success': True,
                'url': base_url,
                'links': links,
                'count': len(links),
                'internal': sum(1 for l in links if l['internal']),
                'external': sum(1 for l in links if not l['internal'])
            }

        except Exception as e:
            logger.error(f"Link extraction failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def scrape_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Scrape structured data from a webpage using CSS selectors
        """
        url = params.get('url', '')
        selectors = params.get('selectors', {})

        if not url:
            return {
                'success': False,
                'error': 'URL parameter is required'
            }

        if not selectors:
            return {
                'success': False,
                'error': 'Selectors parameter is required'
            }

        try:
            async with self.session.get(url, timeout=10) as response:
                html = await response.text()

            soup = BeautifulSoup(html, 'lxml')
            scraped_data = {}

            for key, selector_config in selectors.items():
                if isinstance(selector_config, str):
                    # Simple selector
                    elements = soup.select(selector_config)
                    if elements:
                        scraped_data[key] = [elem.get_text(strip=True) for elem in elements]
                elif isinstance(selector_config, dict):
                    # Complex selector with options
                    selector = selector_config.get('selector', '')
                    attribute = selector_config.get('attribute')
                    single = selector_config.get('single', False)

                    elements = soup.select(selector)

                    if elements:
                        if attribute:
                            values = [elem.get(attribute) for elem in elements if elem.get(attribute)]
                        else:
                            values = [elem.get_text(strip=True) for elem in elements]

                        scraped_data[key] = values[0] if single and values else values

            return {
                'success': True,
                'url': url,
                'data': scraped_data,
                'fieldsExtracted': len(scraped_data)
            }

        except Exception as e:
            logger.error(f"Scraping failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def handle_message(self, message: str):
        """Handle incoming message"""
        try:
            request = json.loads(message)
            logger.debug(f"Received request: {request.get('type')} - {request.get('tool')}")

            if request['type'] == 'tool' and request.get('tool'):
                handler = self.tools.get(request['tool'])

                if not handler:
                    self.send_error(
                        Exception(f"Unknown tool: {request['tool']}"),
                        request.get('id')
                    )
                    return

                result = await handler(request.get('params', {}))

                self.send_response({
                    'type': 'tool_response',
                    'requestId': request.get('id'),
                    'tool': request['tool'],
                    'result': result
                })

            elif request['type'] == 'list_tools':
                self.send_response({
                    'type': 'tools_list',
                    'requestId': request.get('id'),
                    'tools': [
                        {
                            'name': name,
                            'description': self.get_tool_description(name)
                        }
                        for name in self.tools.keys()
                    ]
                })

            elif request['type'] == 'ping':
                self.send_response({
                    'type': 'pong',
                    'requestId': request.get('id'),
                    'timestamp': datetime.now().isoformat()
                })

            else:
                self.send_error(
                    Exception(f"Unknown request type: {request['type']}"),
                    request.get('id')
                )

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON: {e}")
            self.send_error(e)
        except Exception as e:
            logger.error(f"Failed to handle message: {e}")
            self.send_error(e)

    async def run(self):
        """Run the MCP server"""
        await self.initialize()

        # Read from stdin
        loop = asyncio.get_event_loop()
        reader = asyncio.StreamReader()
        protocol = asyncio.StreamReaderProtocol(reader)
        await loop.connect_read_pipe(lambda: protocol, sys.stdin)

        logger.info(f"{self.server_name} is running")

        try:
            while True:
                line = await reader.readline()
                if not line:
                    break

                message = line.decode('utf-8').strip()
                if message:
                    await self.handle_message(message)

        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        finally:
            await self.shutdown()

    async def shutdown(self):
        """Shutdown the server"""
        logger.info("Shutting down server")
        if self.session:
            await self.session.close()
        sys.exit(0)


def main():
    """Main entry point"""
    server = WebSearchMCP()

    # Handle signals
    import signal

    def signal_handler(sig, frame):
        logger.info(f"Received signal {sig}")
        asyncio.create_task(server.shutdown())

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run the server
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()