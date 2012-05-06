require 'uri'
require 'net/http'

api_url = "http://127.0.0.1:8000/send_delayed"
url = "http://127.0.0.1:8000/health"
recheck_url = "http://127.0.0.1:8000/recheck_url_error"
uid=(rand()*1000).to_i
type="test"
delay=1
post_url = URI.parse(api_url)
res = Net::HTTP.post_form(post_url,{"url" => url, "delay" => delay,
  "uid" => uid, "type" => type, "recheck_url" => recheck_url, "send_than_online" => true})
p res.inspect